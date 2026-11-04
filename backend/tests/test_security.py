# Security regression (iteration 9): self-hosted libs, CSP, join allowlist, CORS
import os
import re
from urllib.parse import urlparse
import pytest
import requests

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")).rstrip("/")
HOST = urlparse(BASE_URL).hostname


def href(body):
    return re.search(r'id="open" href="([^"]*)"', body).group(1)


@pytest.fixture
def s():
    return requests.Session()


class TestLibs:
    @pytest.mark.parametrize("name", ["other.js", "..%2Fserver.py", "three.js", "peerjs.min.js.map"])
    def test_unknown_lib_404(self, s, name):
        assert s.get(f"{BASE_URL}/api/lib/{name}").status_code == 404

    def test_stage_uses_self_hosted(self, s):
        body = s.get(f"{BASE_URL}/api/stage").text
        assert "/api/lib/three.min.js" in body or "lib/three.min.js" in body
        assert "lib/peerjs.min.js" in body
        assert "cdn.jsdelivr" not in body and "unpkg" not in body


class TestCSP:
    def test_csp_header(self, s):
        csp = s.get(f"{BASE_URL}/api/stage").headers.get("content-security-policy", "")
        assert "frame-ancestors 'self'" in csp
        assert "default-src 'self'" in csp
        assert "wss://0.peerjs.com" in csp


class TestJoinAllowlist:
    @pytest.mark.parametrize("bad", ["exp://evil.com/--/", "exps://evil.com/--/", "exp://emergentagent.com.evil.com/--/",
                                     "https://evil.com/", "javascript:alert(1)//", f"https://{HOST}.evil.com/"])
    def test_rejected(self, s, bad):
        r = s.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": bad})
        assert r.status_code == 200
        assert href(r.text) == "frontend://sender?code=123456"

    @pytest.mark.parametrize("good", ["exp://x1.preview.emergentagent.com/--/", "exp://x1.preview.emergentagent.com:443/--/",
                                      "exps://foo.emergent.host/--/"])
    def test_allowed(self, s, good):
        r = s.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": good})
        assert href(r.text) == (good if good.endswith("/") else good + "/") + "sender?code=123456"

    def test_same_host(self, s):
        r = s.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": f"https://{HOST}"})
        assert href(r.text) == f"https://{HOST}/sender?code=123456"


class TestCORS:
    def test_no_credentials_reflection(self, s):
        r = s.get(f"{BASE_URL}/api/", headers={"Origin": "https://evil.com"})
        assert r.headers.get("access-control-allow-credentials") != "true"
        assert r.headers.get("access-control-allow-origin") in ("*", None)

    def test_preflight(self, s):
        r = s.options(f"{BASE_URL}/api/status", headers={"Origin": "https://evil.com", "Access-Control-Request-Method": "POST"})
        assert r.headers.get("access-control-allow-credentials") != "true"
        assert r.headers.get("access-control-allow-origin") != "https://evil.com"
