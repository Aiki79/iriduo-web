# Quick external re-check of presence ownership (token required, 409 for other token, DELETE only with owner token).
# Low call count so it fits the per-IP limits (40 writes / 60 reads per minute) of the shared pod IP.
import os
import random
import uuid
import requests
import pytest

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")


@pytest.fixture
def code():
    c = f"{random.randint(0, 999999):06d}"
    yield c


def _online(s, c):
    r = s.get(f"{BASE_URL}/api/presence", params={"codes": c}, timeout=15)
    assert r.status_code == 200, r.text
    return c in r.json()["online"]


def test_presence_ownership_external(code):
    s = requests.Session()
    owner = f"TEST-{uuid.uuid4().hex}"
    other = f"TEST-{uuid.uuid4().hex}"
    # token required
    assert s.post(f"{BASE_URL}/api/presence", json={"code": code}, timeout=15).status_code == 422
    assert s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": "short"}, timeout=15).status_code == 422
    # owner claims
    r = s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": owner}, timeout=15)
    assert r.status_code == 200 and r.json() == {"ok": True}
    assert _online(s, code)
    # owner refresh ok, other token 409
    assert s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": owner}, timeout=15).status_code == 200
    r = s.post(f"{BASE_URL}/api/presence", json={"code": code, "token": other}, timeout=15)
    assert r.status_code == 409 and r.json()["detail"] == "Codice già in uso"
    # DELETE without/with wrong token -> no effect
    assert s.delete(f"{BASE_URL}/api/presence/{code}", timeout=15).status_code == 200
    assert s.delete(f"{BASE_URL}/api/presence/{code}", params={"token": other}, timeout=15).status_code == 200
    assert _online(s, code)
    # owner DELETE -> offline
    assert s.delete(f"{BASE_URL}/api/presence/{code}", params={"token": owner}, timeout=15).status_code == 200
    assert not _online(s, code)
