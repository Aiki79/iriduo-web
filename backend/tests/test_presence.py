# Presence ("Sala d'Attesa") API with ownership tokens (SEC-001), rate limits (SEC-002), /api/status removed (SEC-003)
import os
import random
import time
import uuid
import pytest
import requests

# Rate-limit tests forge X-Forwarded-For, which only works against http://localhost:8001 (behind the ingress the real client hop is used).
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")


def _ip():
    return f"10.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"


def _tok():
    return f"TEST-{uuid.uuid4().hex}"


@pytest.fixture
def s():
    # Distinct X-Forwarded-For per test to avoid self-throttling by the in-memory rate limiter
    sess = requests.Session()
    sess.headers["X-Forwarded-For"] = _ip()
    return sess


@pytest.fixture
def owned():
    c, t = f"{random.randint(100000, 999999)}", _tok()
    yield c, t
    requests.delete(f"{BASE_URL}/api/presence/{c}", params={"token": t}, headers={"X-Forwarded-For": _ip()})


def online(s, code):
    return s.get(f"{BASE_URL}/api/presence", params={"codes": code}).json()["online"]


# Core presence flows with token
class TestPresence:
    def test_ping_then_online(self, s, owned):
        code, tok = owned
        r = s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok})
        assert r.status_code == 200 and r.json() == {"ok": True}
        other = "000001" if code != "000001" else "000002"
        g = s.get(f"{BASE_URL}/api/presence", params={"codes": f"{code},{other}"})
        assert g.status_code == 200 and g.json()["online"] == [code]

    def test_ping_idempotent_same_token(self, s, owned):
        code, tok = owned
        for _ in range(3):
            assert s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok}).status_code == 200
        assert online(s, code) == [code]

    def test_delete_with_token_makes_offline(self, s, owned):
        code, tok = owned
        s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok})
        d = s.delete(f"{BASE_URL}/api/presence/{code}", params={"token": tok})
        assert d.status_code == 200 and d.json() == {"ok": True}
        assert online(s, code) == []

    @pytest.mark.parametrize("bad", ["12345", "1234567", "abcdef", "", "12 456"])
    def test_invalid_code_422(self, s, bad):
        assert s.post(f"{BASE_URL}/api/presence", json={"code": bad, "token": _tok()}).status_code == 422

    @pytest.mark.parametrize("bad_tok", [None, "", "short", "a" * 15, "a" * 65, "bad token with space!!", "abc_def_ghi_jkl_mno"])
    def test_invalid_or_missing_token_422(self, s, bad_tok):
        body = {"code": "123456"} if bad_tok is None else {"code": "123456", "token": bad_tok}
        assert s.post(f"{BASE_URL}/api/presence", json=body).status_code == 422

    def test_token_boundaries_ok(self, s):
        for n in (16, 64):
            c, t = f"{random.randint(100000, 999999)}", "a" * (n - 1) + "-"
            assert s.post(f"{BASE_URL}/api/presence", json={"code": c, "token": t}).status_code == 200
            s.delete(f"{BASE_URL}/api/presence/{c}", params={"token": t})

    def test_missing_body_422(self, s):
        assert s.post(f"{BASE_URL}/api/presence", json={}).status_code == 422

    def test_get_no_valid_codes(self, s):
        for q in ["", "abc,12", "1234567"]:
            r = s.get(f"{BASE_URL}/api/presence", params={"codes": q})
            assert r.status_code == 200 and r.json() == {"online": []}
        assert s.get(f"{BASE_URL}/api/presence").json() == {"online": []}

    def test_get_too_long_422(self, s):
        assert s.get(f"{BASE_URL}/api/presence", params={"codes": "1" * 201}).status_code == 422

    def test_delete_invalid_code_ok(self, s):
        assert s.delete(f"{BASE_URL}/api/presence/abc", params={"token": _tok()}).status_code == 200


# SEC-001: ownership – another token cannot hijack or delete a fresh code
class TestOwnership:
    def test_conflict_other_token_409(self, s, owned):
        code, tok = owned
        assert s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok}).status_code == 200
        r = s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": _tok()})
        assert r.status_code == 409
        assert "uso" in r.json().get("detail", "")
        # original owner can still refresh
        assert s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok}).status_code == 200

    def test_delete_wrong_token_keeps_online(self, s, owned):
        code, tok = owned
        s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok})
        d = s.delete(f"{BASE_URL}/api/presence/{code}", params={"token": _tok()})
        assert d.status_code == 200 and d.json() == {"ok": True}
        assert online(s, code) == [code]

    def test_delete_missing_token_keeps_online(self, s, owned):
        code, tok = owned
        s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok})
        d = s.delete(f"{BASE_URL}/api/presence/{code}")
        assert d.status_code == 200 and d.json() == {"ok": True}
        assert online(s, code) == [code]

    def test_stale_takeover_after_20s(self, s, owned):
        code, tok = owned
        assert s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok}).status_code == 200
        time.sleep(21)
        assert online(s, code) == []
        new_tok = _tok()
        assert s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": new_tok}).status_code == 200
        assert online(s, code) == [code]
        # old owner is now locked out while new one is fresh
        assert s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok}).status_code == 409
        s.delete(f"{BASE_URL}/api/presence/{code}", params={"token": new_tok})
        assert online(s, code) == []


# Iteration 14: presence TTL – a code is online only if pinged within the last 20s
class TestPresenceTTL:
    def test_stale_ping_goes_offline_after_20s(self, s, owned):
        code, tok = owned
        assert s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok}).status_code == 200
        time.sleep(12)
        assert online(s, code) == [code]
        time.sleep(10)
        assert online(s, code) == []

    def test_reping_keeps_online(self, s, owned):
        code, tok = owned
        s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok})
        time.sleep(12)
        s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok})
        time.sleep(12)
        assert online(s, code) == [code]


# SEC-002: in-memory per-IP rate limits (40 writes/min, 60 reads/min)
class TestRateLimit:
    def test_write_limit_429(self, s):
        code, tok = f"{random.randint(100000, 999999)}", _tok()
        codes = [s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": tok}).status_code for _ in range(45)]
        assert codes[:40] == [200] * 40, codes
        assert 429 in codes[40:]
        # delete shares the write bucket
        assert s.delete(f"{BASE_URL}/api/presence/{code}", params={"token": tok}).status_code == 429
        requests.delete(f"{BASE_URL}/api/presence/{code}", params={"token": tok}, headers={"X-Forwarded-For": _ip()})

    def test_read_limit_429(self, s):
        codes = [s.get(f"{BASE_URL}/api/presence", params={"codes": "123456"}).status_code for _ in range(65)]
        assert codes[:60] == [200] * 60, codes
        assert codes[60:] and all(c == 429 for c in codes[60:])

    def test_other_ip_not_throttled(self, s):
        for _ in range(61):
            s.get(f"{BASE_URL}/api/presence", params={"codes": "123456"})
        other = requests.get(f"{BASE_URL}/api/presence", params={"codes": "123456"}, headers={"X-Forwarded-For": _ip()})
        assert other.status_code == 200


# SEC-003: leftover /api/status removed
class TestStatusRemoved:
    def test_status_get_404(self, s):
        assert s.get(f"{BASE_URL}/api/status").status_code == 404

    def test_status_post_404(self, s):
        assert s.post(f"{BASE_URL}/api/status", json={"client_name": "TEST_x"}).status_code in (404, 405)


class TestRename:
    def test_join_title_iriduo(self, s):
        r = s.get(f"{BASE_URL}/api/join", params={"code": "123456"})
        assert r.status_code == 200
        assert "<title>IriDuo · codice 123456</title>" in r.text
