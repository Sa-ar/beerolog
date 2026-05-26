from fastapi.testclient import TestClient

from app.auth import get_current_user
from app.dependencies import get_user_profile_repo
from app.main import app
from app.services.user_profile_service import InMemoryUserProfileRepo

VECTOR = [0.2, 0.15, 0.1, 0.0, 0.0, 0.25, 0.15]
FAKE_USER = {"sub": "user-123", "email": "test@example.com"}


def make_client(repo=None, authed=True):
    repo = repo or InMemoryUserProfileRepo()
    app.dependency_overrides[get_user_profile_repo] = lambda: repo
    if authed:
        app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    else:
        app.dependency_overrides.pop(get_current_user, None)
    return TestClient(app), repo


def test_get_profile_returns_none_when_not_set():
    client, _ = make_client()
    resp = client.get("/users/me/profile")
    assert resp.status_code == 200
    assert resp.json()["vector"] is None


def test_get_profile_without_auth_returns_401():
    client, _ = make_client(authed=False)
    resp = client.get("/users/me/profile")
    assert resp.status_code == 401


def test_put_profile_saves_vector():
    client, _ = make_client()
    client.put("/users/me/profile", json={"vector": VECTOR})
    resp = client.get("/users/me/profile")
    assert resp.json()["vector"] == VECTOR


def test_put_profile_rejects_wrong_vector_length():
    client, _ = make_client()
    resp = client.put("/users/me/profile", json={"vector": VECTOR[:-1]})
    assert resp.status_code == 422


def test_get_history_returns_entries():
    import asyncio

    repo = InMemoryUserProfileRepo()
    asyncio.run(repo.add_to_history("user-123", "b1", "loved"))
    client, _ = make_client(repo=repo)
    resp = client.get("/users/me/history")
    assert resp.status_code == 200
    entries = resp.json()["entries"]
    assert len(entries) == 1
    assert entries[0]["beer_id"] == "b1"


def test_get_persona_returns_summary_after_profile_saved():
    client, _ = make_client()
    client.put("/users/me/profile", json={"vector": VECTOR})

    resp = client.get("/users/me/persona")
    assert resp.status_code == 200
    persona = resp.json()["persona"]
    assert persona is not None
    assert persona["id"]
    assert persona["name"]
    assert persona["icon"]


def test_rate_beer_rejects_wrong_vector_length():
    client, _ = make_client()
    resp = client.post(
        "/users/me/rate",
        json={
            "beer": {
                "id": "beer-1",
                "name": "Beer 1",
                "style": "lager",
                "flavor_vector": VECTOR[:-1],
            },
            "rating": "loved",
        },
    )
    assert resp.status_code == 422


def test_rate_beer_returns_updated_vector():
    import asyncio

    repo = InMemoryUserProfileRepo()
    asyncio.run(repo.save_profile("user-123", VECTOR))
    client, _ = make_client(repo=repo)

    resp = client.post(
        "/users/me/rate",
        json={
            "beer": {
                "id": "beer-1",
                "name": "Beer 1",
                "style": "stout",
                "flavor_vector": [0.4, 0.3, 0.1, 0.9, 0.0, 0.8, 0.3],
            },
            "rating": "loved",
        },
    )

    assert resp.status_code == 200
    assert resp.json()["updated_vector"] == asyncio.run(repo.get_profile("user-123"))
