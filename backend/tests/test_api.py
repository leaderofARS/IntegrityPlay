import os
import time
from fastapi.testclient import TestClient

from backend.main import app


def test_health():
    client = TestClient(app)
    r = client.get("/api/health")
    assert r.status_code == 200
    d = r.json()
    assert d["status"] == "ok"


def test_run_demo_creates_alert_artifact(tmp_path):
    client = TestClient(app)
    # speed up demo
    r = client.post("/api/run_demo", json={"scenario": "wash_trade", "speed": 5, "duration": 2, "no_throttle": True})
    assert r.status_code == 200
    # wait for artifact with timeout
    for _ in range(30):
        if os.path.exists("results/alerts/ALERT-DEMO-001.json"):
            break
        time.sleep(0.5)
    assert os.path.exists("results/alerts/ALERT-DEMO-001.json")

