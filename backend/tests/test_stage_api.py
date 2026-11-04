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

    # libs are now self-hosted (security fix iteration 9)
    def test_self_hosted_libs(self, s):
        for n in ["three.min.js", "peerjs.min.js"]:
            r = s.get(f"{BASE_URL}/api/lib/{n}", timeout=20)
            assert r.status_code == 200
            assert "javascript" in r.headers["content-type"]
            assert len(r.content) > 50000
