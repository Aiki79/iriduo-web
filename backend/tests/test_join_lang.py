# Join page localisation: <title>/og meta follow ?lang= (iteration 30)
import os
import re
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", os.environ.get("EXPO_BACKEND_URL")).rstrip("/")


def _get(lang=None):
    params = {"code": "123456"}
    if lang:
        params["lang"] = lang
    return requests.get(f"{BASE_URL}/api/join", params=params, timeout=15)


def test_join_en_title_and_og():
    r = _get("en")
    assert r.status_code == 200
    assert "<title>IriDuo · code 123456</title>" in r.text
    assert 'og:title" content="IriDuo · code 123456"' in r.text
    assert "face to face, in 3D. Tap to open the app and call the headset." in r.text
    assert "a tu per tu" not in re.search(r"<head>.*?<style>", r.text, re.S).group(0)


def test_join_it_title_and_og():
    r = _get("it")
    assert r.status_code == 200
    assert "<title>IriDuo · codice 123456</title>" in r.text
    assert "a tu per tu, in 3D. Tocca per aprire" in r.text


def test_join_default_is_italian():
    r = _get()
    assert r.status_code == 200
    assert "IriDuo · codice 123456" in r.text


def test_join_invalid_lang_rejected():
    r = _get("fr")
    assert r.status_code == 422


def test_join_app_url_contains_code():
    r = _get("en")
    assert "sender?code=123456" in r.text
