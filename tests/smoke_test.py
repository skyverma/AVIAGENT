"""Smoke tests for AVIAGENT services."""
import os
import sys

import httpx

API = os.environ.get("API_URL", "http://localhost:8011")
AUTH = os.environ.get("AUTH_URL", "http://localhost:8002")
AI = os.environ.get("AI_URL", "http://localhost:8012")


def test_health():
    for name, url in [("api", f"{API}/health"), ("auth", f"{AUTH}/healthz/"), ("ai", f"{AI}/health")]:
        r = httpx.get(url, timeout=10)
        assert r.status_code == 200, f"{name} health failed: {r.status_code}"
        print(f"OK {name}")


def test_ai_codegen():
    r = httpx.post(f"{AI}/python-compiler/generate", json={"prompt": "summarize df1"}, timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "code" in data
    print("OK ai codegen")


if __name__ == "__main__":
    test_health()
    test_ai_codegen()
    print("All smoke tests passed")
