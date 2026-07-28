"""Tests for the want-to-try routes (slice #325).

In-memory repo + fake Clerk dep override so the tests run without a DB or a
real Clerk session, mirroring test_ratings_route.
"""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.dependencies import get_taste_feedback_service
from app.main import app
from app.routes.want_to_try import get_want_to_try_repo
from app.services.want_to_try_repo import WantToTryRow


class _RecordingFeedback:
    """Captures the taste-signal nudges so the test can assert right/super-like feed it."""

    def __init__(self) -> None:
        self.calls: list[tuple[str, str, str]] = []

    async def apply(self, *, user_id: str, beer_id: str, rating: str) -> None:
        self.calls.append((user_id, beer_id, rating))


class _MemoryRepo:
    def __init__(self, existing_beers: set[str]) -> None:
        self._beers = existing_beers
        # (user_id, beer_id) -> WantToTryRow, insertion-ordered
        self._rows: dict[tuple[str, str], WantToTryRow] = {}
        self._seq = 0

    async def beer_exists(self, beer_id: str) -> bool:
        return beer_id in self._beers

    async def upsert(self, *, user_id: str, beer_id: str, state: str) -> WantToTryRow:
        self._seq += 1
        row = WantToTryRow(
            beer_id=beer_id,
            beer_name=f"Beer {beer_id}",
            beer_brewery="Test Brewery",
            beer_image_url=None,
            state=state,
            created_at=f"2026-06-15T00:00:{self._seq:02d}+00:00",
        )
        self._rows[(user_id, beer_id)] = row
        return row

    async def list_for_user(self, user_id: str) -> list[WantToTryRow]:
        rows = [r for (u, _), r in self._rows.items() if u == user_id]
        # must_try pinned first, then most-recent.
        rows.sort(key=lambda r: (r.state != "must_try", _neg(r.created_at)))
        return rows

    async def remove(self, *, user_id: str, beer_id: str) -> bool:
        return self._rows.pop((user_id, beer_id), None) is not None


def _neg(iso: str) -> str:
    # Cheap reverse-chronological key for the in-memory sort (strings compare
    # lexically; invert each char so later timestamps sort first).
    return "".join(chr(255 - ord(c)) for c in iso)


FAKE_USER = {"sub": "user_test_123"}


@pytest.fixture
def repo() -> _MemoryRepo:
    return _MemoryRepo(existing_beers={"goldstar", "alexander-blazer", "malka-stout"})


@pytest.fixture
def feedback() -> _RecordingFeedback:
    return _RecordingFeedback()


@pytest.fixture
def client(repo: _MemoryRepo, feedback: _RecordingFeedback) -> TestClient:
    app.dependency_overrides[get_want_to_try_repo] = lambda: repo
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    app.dependency_overrides[get_taste_feedback_service] = lambda: feedback
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_want_to_try_repo, None)
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_taste_feedback_service, None)


def test_add_want_returns_201(client: TestClient) -> None:
    r = client.post("/me/want-to-try", json={"beer_id": "goldstar", "state": "want"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["beer_id"] == "goldstar"
    assert body["state"] == "want"


def test_add_defaults_to_want(client: TestClient) -> None:
    r = client.post("/me/want-to-try", json={"beer_id": "goldstar"})
    assert r.status_code == 201
    assert r.json()["state"] == "want"


def test_add_rejects_unknown_beer(client: TestClient) -> None:
    r = client.post("/me/want-to-try", json={"beer_id": "made-up", "state": "want"})
    assert r.status_code == 404


def test_add_rejects_invalid_state(client: TestClient) -> None:
    for bad in ("", "loved", "MUST_TRY", 1):
        r = client.post("/me/want-to-try", json={"beer_id": "goldstar", "state": bad})
        assert r.status_code == 422, bad


def test_right_and_super_like_feed_the_taste_signal(
    client: TestClient, feedback: _RecordingFeedback
) -> None:
    client.post("/me/want-to-try", json={"beer_id": "goldstar", "state": "want"})
    client.post("/me/want-to-try", json={"beer_id": "malka-stout", "state": "must_try"})
    assert ("user_test_123", "goldstar", "loved") in feedback.calls
    assert ("user_test_123", "malka-stout", "loved") in feedback.calls


def test_list_pins_must_try_first(client: TestClient) -> None:
    client.post("/me/want-to-try", json={"beer_id": "goldstar", "state": "want"})
    client.post("/me/want-to-try", json={"beer_id": "alexander-blazer", "state": "want"})
    client.post("/me/want-to-try", json={"beer_id": "malka-stout", "state": "must_try"})
    r = client.get("/me/want-to-try")
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert items[0]["beer_id"] == "malka-stout"  # super-like pinned to top
    assert {i["beer_id"] for i in items} == {"goldstar", "alexander-blazer", "malka-stout"}


def test_remove_deletes_the_item(client: TestClient) -> None:
    client.post("/me/want-to-try", json={"beer_id": "goldstar", "state": "want"})
    r = client.delete("/me/want-to-try/goldstar")
    assert r.status_code == 204
    assert client.get("/me/want-to-try").json()["items"] == []


def test_want_to_try_requires_auth() -> None:
    app.dependency_overrides[get_want_to_try_repo] = lambda: _MemoryRepo(set())
    try:
        r = TestClient(app).get("/me/want-to-try")
        assert r.status_code == 401
    finally:
        app.dependency_overrides.pop(get_want_to_try_repo, None)
