from fastapi.testclient import TestClient

from app.main import app


def test_venue_leaderboard_route_is_deferred_from_supported_api():
    client = TestClient(app)

    resp = client.get("/venues/v1/leaderboard")

    assert resp.status_code == 404
