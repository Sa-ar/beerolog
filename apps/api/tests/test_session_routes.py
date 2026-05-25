from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.dependencies import get_session_repo
from app.main import app
from app.services.group_session import InMemorySessionRepo, create_session

LAGER_VECTOR = [0.2, 0.15, 0.1, 0.0, 0.0, 0.25, 0.15]


def make_client(repo=None):
    repo = repo or InMemorySessionRepo()
    app.dependency_overrides[get_session_repo] = lambda: repo
    return TestClient(app), repo


def test_create_session_returns_id_and_expiry():
    client, _ = make_client()
    resp = client.post("/sessions", json={"host_id": "host-1"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["session_id"]
    assert data["expires_at"]


def test_join_session_returns_participant_id():
    client, _ = make_client()
    session_id = client.post("/sessions", json={"host_id": "h1"}).json()["session_id"]
    resp = client.post(f"/sessions/{session_id}/join", json={"name": "Alice"})
    assert resp.status_code == 200
    assert resp.json()["participant_id"]


def test_submit_vector_returns_ok():
    client, _ = make_client()
    session_id = client.post("/sessions", json={"host_id": "h1"}).json()["session_id"]
    pid = client.post(f"/sessions/{session_id}/join", json={"name": "Bob"}).json()["participant_id"]
    resp = client.post(
        f"/sessions/{session_id}/submit", json={"participant_id": pid, "vector": LAGER_VECTOR}
    )
    assert resp.status_code == 200


def test_status_shows_completed_count():
    client, _ = make_client()
    session_id = client.post("/sessions", json={"host_id": "h1"}).json()["session_id"]
    pid = client.post(f"/sessions/{session_id}/join", json={"name": "Alice"}).json()[
        "participant_id"
    ]
    client.post(f"/sessions/{session_id}/join", json={"name": "Bob"})
    client.post(
        f"/sessions/{session_id}/submit", json={"participant_id": pid, "vector": LAGER_VECTOR}
    )

    resp = client.get(f"/sessions/{session_id}/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert data["completed"] == 1


def test_recommend_returns_group_vector():
    client, _ = make_client()
    session_id = client.post("/sessions", json={"host_id": "h1"}).json()["session_id"]
    pid = client.post(f"/sessions/{session_id}/join", json={"name": "Alice"}).json()[
        "participant_id"
    ]
    client.post(
        f"/sessions/{session_id}/submit", json={"participant_id": pid, "vector": LAGER_VECTOR}
    )

    resp = client.get(f"/sessions/{session_id}/recommend")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["group_vector"]) == 7
    assert isinstance(data["high_variance"], bool)


def test_join_expired_session_returns_410():
    import asyncio

    repo = InMemorySessionRepo()
    session = asyncio.run(create_session(repo, "host-1"))
    session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    asyncio.run(repo.save(session))

    client, _ = make_client(repo=repo)
    resp = client.post(f"/sessions/{session.id}/join", json={"name": "Late"})
    assert resp.status_code == 410
