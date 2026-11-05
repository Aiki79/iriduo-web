# Safety: POST /api/reports validation, distinct-reporter auto-suspension, GET /api/suspended, no admin list
import os
import random

import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
# Bulk calls hit the backend directly with a forged 3-hop XFF (hops[-3] = client IP) so the 5/min public limit is not exhausted
LOCAL = "http://localhost:8001/api"


def dev(prefix="testdev"):
    return prefix + "".join(random.choice("0123456789") for _ in range(8))


def xff():
    return f"10.{random.randint(1, 250)}.{random.randint(1, 250)}.{random.randint(1, 250)}, 1.1.1.1, 2.2.2.2"


def rep(reported, reporter, base=LOCAL, ip=None):
    body = {"role": "viewer", "reason": "spam", "note": "TEST_", "reported_device": reported, "reporter_device": reporter}
    return requests.post(f"{base}/reports", json=body, headers={"X-Forwarded-For": ip or xff()}, timeout=15)


def susp(d, base=LOCAL):
    r = requests.get(f"{base}/suspended/{d}", headers={"X-Forwarded-For": xff()}, timeout=15)
    assert r.status_code == 200
    return r.json()


# Admin list removed
class TestNoAdmin:
    def test_get_reports_405(self):
        assert requests.get(f"{API}/reports", timeout=15).status_code == 405

    def test_no_done_endpoint(self):
        assert requests.post(f"{API}/reports/abc/done", timeout=15).status_code in (404, 405)


# Validation: both devices required and different
class TestReportValidation:
    def test_missing_reported_400_public(self):
        r = requests.post(f"{API}/reports", json={"role": "viewer", "reason": "spam", "reporter_device": dev()}, timeout=15)
        assert r.status_code == 400

    def test_missing_reporter_400(self):
        r = requests.post(f"{LOCAL}/reports", json={"role": "viewer", "reason": "spam", "reported_device": dev()}, headers={"X-Forwarded-For": xff()}, timeout=15)
        assert r.status_code == 400

    def test_equal_devices_400(self):
        d = dev()
        assert rep(d, d).status_code == 400

    def test_bad_reason_422(self):
        r = requests.post(f"{LOCAL}/reports", json={"role": "viewer", "reason": "x", "reported_device": dev(), "reporter_device": dev()}, headers={"X-Forwarded-For": xff()}, timeout=15)
        assert r.status_code == 422


# Auto-suspension after 3 distinct reporters; duplicates count once
class TestSuspension:
    def test_distinct_reporters(self):
        target, a, b, c = dev(), dev(), dev(), dev()
        assert susp(target) == {"suspended": False}
        assert rep(target, a).json() == {"ok": True}
        assert rep(target, a).json() == {"ok": True}  # same reporter again
        assert rep(target, b).status_code == 200
        assert susp(target)["suspended"] is False, "duplicate reporter must count once"
        assert rep(target, c).status_code == 200
        assert susp(target)["suspended"] is True
        # public endpoint sees the same
        assert requests.get(f"{API}/suspended/{target}", timeout=15).json() == {"suspended": True}
        # reporters themselves are not suspended
        assert susp(a)["suspended"] is False

    def test_invalid_dev_false(self):
        for d in ["ABC", "short", "has-dash-123456", "x" * 41]:
            assert susp(d) == {"suspended": False}


# Rate limit 5/min per client IP
class TestReportRateLimit:
    def test_sixth_429(self):
        ip = xff()
        target = dev()
        codes = [rep(target, dev(), ip=ip).status_code for _ in range(6)]
        assert codes[:5] == [200] * 5 and codes[5] == 429, codes


# Concurrent duplicate reports from the same pair must not 500 and must leave one document
class TestPairUniqueness:
    def test_parallel_same_pair(self):
        from concurrent.futures import ThreadPoolExecutor
        target, a, b = dev(), dev(), dev()
        with ThreadPoolExecutor(8) as ex:
            codes = [r.status_code for r in ex.map(lambda _: rep(target, a), range(8))]
        assert codes == [200] * 8, codes
        assert rep(target, b).status_code == 200
        assert susp(target)["suspended"] is False, "2 distinct reporters must not suspend"

    def test_unique_index_rejects_duplicate(self):
        import asyncio
        from dotenv import load_dotenv
        from motor.motor_asyncio import AsyncIOMotorClient
        from pymongo.errors import DuplicateKeyError
        load_dotenv("/app/backend/.env")

        async def go():
            db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
            t, a = dev(), dev()
            doc = {"reporter_device": a, "reported_device": t, "note": "TEST_"}
            await db.reports.insert_one(dict(doc))
            try:
                await db.reports.insert_one(dict(doc))
                return False
            except DuplicateKeyError:
                return True
            finally:
                await db.reports.delete_many({"reported_device": t, "reporter_device": a})
        assert asyncio.run(go()) is True
