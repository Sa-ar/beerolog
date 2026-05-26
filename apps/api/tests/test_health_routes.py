from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.main import app


def test_health_route_includes_request_id_header():
    client = TestClient(app)

    resp = client.get("/health")

    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
    assert resp.headers["X-Request-ID"]
