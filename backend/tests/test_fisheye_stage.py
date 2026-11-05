# Fisheye (ELP dual-circle) mode: static checks on the served stage page
import os
import re

import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", os.environ.get("EXPO_BACKEND_URL")).rstrip("/")


@pytest.fixture(scope="module")
def html():
    r = requests.get(f"{BASE_URL}/api/stage", params={"mode": "viewer"}, timeout=20)
    assert r.status_code == 200
    assert "text/html" in r.headers.get("content-type", "")
    return r.text


# Stage contains fisheye defaults/limits/handlers
def test_fisheye_defaults_and_limits(html):
    assert "const FE_BASE = { dx: 0, dy: 0, raggio: 100, fov: 187, occhio: 0 }" in html
    assert "dx: [-150, 150], dy: [-150, 150], raggio: [70, 130], fov: [160, 220], occhio: [-40, 40]" in html
    assert "handlers.setFisheye" in html and "handlers.resetFisheye" in html
    assert "localStorage.setItem('fisheye'" in html


# Regression: missing localStorage (null) must not coerce to 0 -> clamped 70/160
def test_pulisci_fe_null_safe(html):
    assert "Number(o && o[k])" not in html


# Equidistant model + 128x64 sphere for fisheye
def test_equidistant_formula(html):
    assert "SphereGeometry(10, 128, 64, Math.PI, Math.PI)" in html
    assert "Math.acos(Math.max(-1, Math.min(1, -z / l)))" in html
    assert "Math.atan2(y, x)" in html
    assert "uv.setXY(i, cx + r * Math.cos(phi) / W, cy + r * Math.sin(phi) / H)" in html


# Fisheye settings never sent over the peer data channel
def test_fisheye_not_sent_over_datachannel(html):
    sends = re.findall(r"\.send\(\{[^}]*\}", html)
    assert sends, "expected some dc.send calls"
    for s in sends:
        assert "fe" not in re.findall(r"\b\w+\b", s), s
        assert "fisheye" not in s.lower(), s
    allowed = {"decline", "cancel", "chat", "react"}
    kinds = set(re.findall(r"\.send\(\{\s*t:\s*'(\w+)'", html))
    assert kinds <= allowed, kinds


# Sender mode page still served
def test_sender_mode_served():
    r = requests.get(f"{BASE_URL}/api/stage", params={"mode": "sender"}, timeout=20)
    assert r.status_code == 200
    assert "MODE !== 'sender'" in r.text
