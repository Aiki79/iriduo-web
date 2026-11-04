# Rate limiter must key on the real client hop (3rd-from-last XFF), so forged X-Forwarded-For can't bypass it.
# Run ONLY against the external URL, and wait 60s afterwards before other presence tests (it exhausts the read bucket).
import os
import random
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")


def _forged():
    return f"10.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}"


def test_forged_xff_does_not_bypass_read_limit():
    s = requests.Session()
    codes = []
    for i in range(61):
        hdr = {"X-Forwarded-For": _forged()} if i % 2 == 0 else {"X-Forwarded-For": f"{_forged()}, {_forged()}, {_forged()}"}
        r = s.get(f"{BASE_URL}/api/presence", params={"codes": "123456"}, headers=hdr, timeout=15)
        codes.append(r.status_code)
        if r.status_code == 429:
            break
    print("status sequence:", codes, "count:", len(codes))
    assert 429 in codes, f"no 429 after {len(codes)} requests with forged XFF"
    # the 429 must arrive at or before the 61st request (earlier if other pod traffic shares the IP)
    assert len(codes) <= 61
    r = s.get(f"{BASE_URL}/api/presence", params={"codes": "123456"}, headers={"X-Forwarded-For": _forged()}, timeout=15)
    assert r.status_code == 429
    assert r.json()["detail"] == "Troppe richieste, riprova tra poco"
