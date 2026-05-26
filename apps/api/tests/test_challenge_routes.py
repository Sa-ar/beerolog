from fastapi.testclient import TestClient

from app.main import app


def test_challenge_routes_are_deferred_from_supported_api():
    client = TestClient(app)

    create_resp = client.post("/challenges")
    compare_resp = client.post(
        "/challenges/demo-token/compare",
        json={"vector": [0.2, 0.15, 0.1, 0.0, 0.0, 0.25, 0.15]},
    )

    assert create_resp.status_code == 404
    assert compare_resp.status_code == 404
