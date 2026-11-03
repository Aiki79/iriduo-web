import os
import pytest
import requests

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")).rstrip("/")


@pytest.fixture
def s():
    return requests.Session()


# Health / root
class TestBasics:
    def test_api_root(self, s):
        r = s.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json()["message"] == "Hello World"


# Stage HTML served for WebView/iframe
class TestStage:
    @pytest.mark.parametrize("mode", ["viewer", "sender"])
    def test_stage_html(self, s, mode):
        r = s.get(f"{BASE_URL}/api/stage", params={"mode": mode})
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")
        assert "no-cache" in r.headers.get("cache-control", "")
        body = r.text
        assert "peerjs" in body.lower()
        assert "three" in body.lower()
        assert "__cmd" in body

    def test_stage_no_mode(self, s):
        r = s.get(f"{BASE_URL}/api/stage")
        assert r.status_code == 200

    def test_cdn_scripts_reachable(self, s):
        for u in ["https://cdn.jsdelivr.net/npm/three@0.158.0/build/three.min.js",
                  "https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js"]:
            assert s.get(u, timeout=20).status_code == 200
