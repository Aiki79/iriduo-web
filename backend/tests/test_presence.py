# Presence ("Sala d'Attesa") API + IriDuo rename on /api/join
import os
import random
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")


@pytest.fixture
def s():
    return requests.Session()


@pytest.fixture
def code():
    c = f"{random.randint(100000, 999999)}"
    yield c
    requests.delete(f"{BASE_URL}/api/presence/{c}")


class TestPresence:
    def test_ping_then_online(self, s, code):
        r = s.post(f"{BASE_URL}/api/presence", json={"code": code})
        assert r.status_code == 200 and r.json() == {"ok": True}
        other = "000001" if code != "000001" else "000002"
        g = s.get(f"{BASE_URL}/api/presence", params={"codes": f"{code},{other}"})
        assert g.status_code == 200
        assert g.json()["online"] == [code]

    def test_ping_idempotent(self, s, code):
        for _ in range(3):
            assert s.post(f"{BASE_URL}/api/presence", json={"code": code}).status_code == 200
        assert s.get(f"{BASE_URL}/api/presence", params={"codes": code}).json()["online"] == [code]

    def test_delete_makes_offline(self, s, code):
        s.post(f"{BASE_URL}/api/presence", json={"code": code})
        d = s.delete(f"{BASE_URL}/api/presence/{code}")
        assert d.status_code == 200 and d.json() == {"ok": True}
        assert s.get(f"{BASE_URL}/api/presence", params={"codes": code}).json()["online"] == []

    @pytest.mark.parametrize("bad", ["12345", "1234567", "abcdef", "", "12 456"])
    def test_invalid_code_422(self, s, bad):
        assert s.post(f"{BASE_URL}/api/presence", json={"code": bad}).status_code == 422

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
        assert s.delete(f"{BASE_URL}/api/presence/abc").status_code == 200


class TestRename:
    def test_join_title_iriduo(self, s):
        r = s.get(f"{BASE_URL}/api/join", params={"code": "123456"})
        assert r.status_code == 200
        assert "<title>IriDuo · codice 123456</title>" in r.text
