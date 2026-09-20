from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthz() -> None:
    resp = client.get("/healthz")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_list_workstreams() -> None:
    resp = client.get("/api/workstreams")
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 5
    assert {"id", "name", "status", "cloud", "risk_score"} <= body[0].keys()


def test_summary() -> None:
    resp = client.get("/api/summary")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_workstreams"] == 5
    assert body["in_review"] == 1
    assert body["blocked"] == 1
    assert "p95_deploy_latency_ms" in body


def test_history_has_at_least_one_point() -> None:
    resp = client.get("/api/history")
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_config_reports_default_adapters() -> None:
    resp = client.get("/api/config")
    assert resp.status_code == 200
    body = resp.json()
    assert body["workstream_repository"] == "memory"
    assert body["telemetry"] == "noop"
    assert body["auth"] == "open"


def test_approve_workstream() -> None:
    resp = client.post("/api/workstreams/ws-002/approve")
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


def test_approve_writes_audit_event() -> None:
    resp = client.get("/api/audit")
    assert resp.status_code == 200
    events = resp.json()
    assert any(e["event"] == "workstream.approved" for e in events)


def test_approve_missing_workstream_returns_404() -> None:
    resp = client.post("/api/workstreams/does-not-exist/approve")
    assert resp.status_code == 404


def test_live_feed_receives_approval_broadcast() -> None:
    with client.websocket_connect("/api/ws/workstreams") as ws:
        resp = client.post("/api/workstreams/ws-004/approve")
        assert resp.status_code == 200
        message = ws.receive_json()
        assert message["id"] == "ws-004"
        assert message["status"] == "approved"
