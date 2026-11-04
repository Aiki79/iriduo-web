import os
import re
from urllib.parse import urlparse

import pytest
import requests

BASE_URL = (os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")).rstrip("/")
HOST = urlparse(BASE_URL).hostname


def open_href(body):
    m = re.search(r'id="open" href="([^"]*)"', body)
    assert m, "open button href missing"
    return m.group(1)


@pytest.fixture
def s():
    return requests.Session()


# Deep link landing page /api/join
class TestJoin:
    def test_exp_scheme(self, s):
        r = s.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": "exp://abc.preview.emergentagent.com/--/"})
        assert r.status_code == 200
        assert "text/html" in r.headers["content-type"]
        assert 'id="code">123456<' in r.text
        assert "codice 123456" in r.text
        assert open_href(r.text) == "exp://abc.preview.emergentagent.com/--/sender?code=123456"

    def test_exp_no_trailing_slash(self, s):
        r = s.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": "exp://abc.preview.emergentagent.com/--"})
        assert open_href(r.text) == "exp://abc.preview.emergentagent.com/--/sender?code=123456"

    def test_default_app(self, s):
        r = s.get(f"{BASE_URL}/api/join", params={"code": "111222"})
        assert r.status_code == 200
        assert open_href(r.text) == "frontend://sender?code=111222"

    @pytest.mark.parametrize("bad", ["javascript:alert(1)", "https://evil.com/", f"https://{HOST}.evil.com/", "data:text/html,x"])
    def test_invalid_scheme_fallback(self, s, bad):
        r = s.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": bad})
        assert r.status_code == 200
        assert open_href(r.text) == "frontend://sender?code=123456"

    def test_xss_escaped(self, s):
        r = s.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": 'exp://a.preview.emergentagent.com/"><script>alert(1)</script>'})
        assert r.status_code == 200
        assert "<script>alert(1)" not in r.text
        assert "&quot;&gt;&lt;script&gt;" in r.text

    @pytest.mark.parametrize("code", ["12345", "1234567", "abcdef", "12345a", ""])
    def test_bad_code_422(self, s, code):
        r = s.get(f"{BASE_URL}/api/join", params={"code": code, "app": "exp://abc.preview.emergentagent.com/--/"})
        assert r.status_code == 422

    def test_missing_code_422(self, s):
        assert s.get(f"{BASE_URL}/api/join").status_code == 422

    def test_same_host_https_allowed(self, s):
        # Web preview: ExpoLinking.createURL("/") == https://<public host>/
        r = s.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": f"https://{HOST}/"})
        assert r.status_code == 200
        assert open_href(r.text) == f"https://{HOST}/sender?code=123456"
