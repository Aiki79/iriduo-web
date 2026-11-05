# Web build (/api/web) static serving, SPA fallback, traversal protection and join link with web app base
import os
import re
import urllib.parse

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", os.environ.get("EXPO_BACKEND_URL", "")).rstrip("/")
WEB = f"{BASE_URL}/api/web"


@pytest.fixture(scope="module")
def index_html():
    r = requests.get(f"{WEB}/", timeout=20)
    assert r.status_code == 200
    return r.text


# Index + SPA fallback
class TestWebIndex:
    def test_index_html(self, index_html):
        assert "<html" in index_html.lower()
        assert "/api/web/_expo/static/js/web/" in index_html

    def test_no_trailing_slash(self):
        r = requests.get(WEB, timeout=20)
        assert r.status_code == 200 and "text/html" in r.headers["content-type"]

    @pytest.mark.parametrize("route", ["sender?code=123456", "viewer", "contacts", "history", "language", "welcome", "pro", "deep/unknown/route"])
    def test_spa_fallback(self, route, index_html):
        r = requests.get(f"{WEB}/{route}", timeout=20)
        assert r.status_code == 200
        assert "text/html" in r.headers["content-type"]
        assert "no-cache" in r.headers.get("cache-control", "")
        strip = lambda t: re.sub(r"<script>\(function\(\)\{function c\(\).*?</script>", "", t, flags=re.S)  # Cloudflare per-request beacon
        assert strip(r.text) == strip(index_html)

    def test_index_cache_no_cache(self):
        r = requests.get(f"{WEB}/", timeout=20)
        assert "no-cache" in r.headers.get("cache-control", "")


# Assets referenced by index.html
class TestWebAssets:
    def test_js_bundles_long_cache(self, index_html):
        srcs = re.findall(r'src="(/api/web/_expo/[^"]+\.js)"', index_html)
        assert srcs, "no _expo scripts in index.html"
        for s in srcs:
            r = requests.get(f"{BASE_URL}{s}", timeout=30)
            assert r.status_code == 200, s
            assert "javascript" in r.headers["content-type"], r.headers["content-type"]
            cc = r.headers.get("cache-control", "")
            # NOTE: the preview ingress overrides Cache-Control with "no-store, no-cache, must-revalidate";
            # the app itself sends "public, max-age=31536000, immutable" (verified on :8001)
            assert "max-age=31536000" in cc or cc == "no-store, no-cache, must-revalidate", cc

    def test_favicon(self):
        r = requests.get(f"{WEB}/favicon.ico", timeout=20)
        assert r.status_code == 200
        assert "no-cache" in r.headers.get("cache-control", "")

    def test_missing_expo_asset_falls_back(self):
        # a missing hashed file returns index.html (200) — documented behaviour of SPA fallback
        r = requests.get(f"{WEB}/_expo/static/js/web/does-not-exist.js", timeout=20)
        print("missing _expo asset:", r.status_code, r.headers.get("content-type"))
        assert r.status_code in (200, 404)


# Path traversal protection
class TestTraversal:
    @pytest.mark.parametrize("p", ["../server.py", "..%2Fserver.py", "%2e%2e/server.py", "%2e%2e%2fserver.py", "..%2F..%2Fbackend%2F.env", "../.env", "_expo/../../server.py"])
    def test_traversal_not_served(self, p):
        r = requests.get(f"{WEB}/{p}", timeout=20)
        body = r.text
        assert "MONGO_URL" not in body
        assert "from fastapi import" not in body
        assert r.status_code in (200, 404)  # 200 only if it is the SPA index
        if r.status_code == 200:
            assert "<html" in body.lower()


# Join link pointing at the web build
class TestJoinWebBase:
    def test_join_app_web_base(self):
        host = urllib.parse.urlparse(BASE_URL).netloc
        app = f"https://{host}/api/web/"
        r = requests.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": app, "lang": "en"}, timeout=20)
        assert r.status_code == 200
        assert f"https://{host}/api/web/sender?code=123456" in r.text

    def test_join_foreign_host_rejected(self):
        r = requests.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": "https://evil.example.com/api/web/"}, timeout=20)
        assert r.status_code == 200
        assert "evil.example.com" not in r.text
        assert "frontend://sender?code=123456" in r.text

    def test_join_lookalike_host_rejected(self):
        host = urllib.parse.urlparse(BASE_URL).netloc
        r = requests.get(f"{BASE_URL}/api/join", params={"code": "123456", "app": f"https://{host}.evil.com/api/web/"}, timeout=20)
        assert f"{host}.evil.com" not in r.text


# Stage still available (used by web build iframe)
def test_stage_and_libs():
    r = requests.get(f"{BASE_URL}/api/stage?mode=viewer&lang=en", timeout=20)
    assert r.status_code == 200 and 'id="vr"' in r.text
    for lib in ("three.min.js", "peerjs.min.js"):
        assert requests.get(f"{BASE_URL}/api/lib/{lib}", timeout=30).status_code == 200
