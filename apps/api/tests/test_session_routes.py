from fastapi.testclient import TestClient

from app.main import app


def test_group_session_routes_are_deferred_from_supported_api():
    client = TestClient(app)

    create_resp = client.post("/sessions", json={"host_id": "host-1"})
    join_resp = client.post("/sessions/session-1/join", json={"name": "Alice"})
    submit_resp = client.post(
        "/sessions/session-1/submit",
        json={"participant_id": "participant-1", "vector": [0.2, 0.15, 0.1, 0.0, 0.0, 0.25, 0.15]},
    )
    status_resp = client.get("/sessions/session-1/status")
    recommend_resp = client.get("/sessions/session-1/recommend")

    assert create_resp.status_code == 404
    assert join_resp.status_code == 404
    assert submit_resp.status_code == 404
    assert status_resp.status_code == 404
    assert recommend_resp.status_code == 404
