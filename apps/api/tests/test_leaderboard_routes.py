from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.dependencies import get_leaderboard_repo
from app.main import app
from app.services.leaderboard import InMemoryLeaderboardRepo

FAKE_USER = {"sub": "viewer-1", "email": "viewer@example.com"}


def make_client(repo=None):
    repo = repo or InMemoryLeaderboardRepo()
    app.dependency_overrides[get_leaderboard_repo] = lambda: repo
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    return TestClient(app), repo


def test_leaderboard_empty_venue():
    client, _ = make_client()
    resp = client.get("/venues/v1/leaderboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["entries"] == []
    assert data["viewer_rank"] is None


def test_leaderboard_returns_ranked_entries():
    client, repo = make_client()
    import asyncio

    asyncio.run(repo.set_user("alice", username="Alice", persona_icon="🌿"))
    asyncio.run(repo.set_user("bob", username="Bob", persona_icon="🌊"))
    asyncio.run(repo.add_rating("alice", venue_id="v1", rating="loved", visible=True))
    asyncio.run(repo.add_rating("alice", venue_id="v1", rating="loved", visible=True))
    asyncio.run(repo.add_rating("bob", venue_id="v1", rating="loved", visible=True))

    resp = client.get("/venues/v1/leaderboard")
    assert resp.status_code == 200
    entries = resp.json()["entries"]
    assert len(entries) == 2
    assert entries[0]["user_id"] == "alice"
    assert entries[0]["rank"] == 1
    assert entries[1]["user_id"] == "bob"
    assert entries[1]["rank"] == 2


def test_leaderboard_viewer_rank_when_private():
    client, repo = make_client()
    import asyncio

    asyncio.run(repo.set_user("alice", username="Alice", persona_icon="🌿"))
    asyncio.run(repo.set_user("viewer-1", username="Me", persona_icon="⚖️"))
    asyncio.run(repo.add_rating("alice", venue_id="v1", rating="loved", visible=True))
    asyncio.run(repo.add_rating("alice", venue_id="v1", rating="loved", visible=True))
    asyncio.run(repo.add_rating("viewer-1", venue_id="v1", rating="loved", visible=False))

    resp = client.get("/venues/v1/leaderboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["viewer_rank"] == 2
    assert all(e["user_id"] != "viewer-1" for e in data["entries"])
