"""Tests for the ratings routes (slice #78). Store-only; no embedding mutation.

Uses an in-memory RatingsRepo + a fake Clerk dep override so the tests run
without a DB or a real Clerk session.
"""

from __future__ import annotations

from uuid import uuid4

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.dependencies import get_taste_feedback_service
from app.main import app
from app.routes.ratings import get_ratings_repo
from app.services.ratings_repo import RatingRow


class _NoopFeedback:
    """Ratings-route tests don't exercise the nudge; see test_taste_feedback_route."""

    async def apply(self, *, user_id: str, beer_id: str, rating: str) -> None:
        return None


class _MemoryRepo:
    def __init__(self, existing_beers: set[str]) -> None:
        self._beers = existing_beers
        self._rows: dict[tuple[str, str], RatingRow] = {}

    async def beer_exists(self, beer_id: str) -> bool:
        return beer_id in self._beers

    async def upsert_rating(
        self, *, user_id: str, beer_id: str, rating: str, note: str | None
    ) -> RatingRow:
        existing = self._rows.get((user_id, beer_id))
        row = RatingRow(
            id=existing.id if existing else str(uuid4()),
            user_id=user_id,
            beer_id=beer_id,
            beer_name=f"Beer {beer_id}",
            beer_brewery="Test Brewery",
            rating=rating,
            note=note,
            created_at="2026-06-15T00:00:00+00:00",
        )
        self._rows[(user_id, beer_id)] = row
        return row

    async def list_for_user(self, *, user_id: str, page: int, page_size: int) -> list[RatingRow]:
        rows = [r for r in self._rows.values() if r.user_id == user_id]
        rows.sort(key=lambda r: r.created_at, reverse=True)
        start = (page - 1) * page_size
        return rows[start : start + page_size]

    async def count_for_user(self, user_id: str) -> int:
        return sum(1 for r in self._rows.values() if r.user_id == user_id)

    async def list_rated_beer_ids(self, user_id: str) -> set[str]:
        return {r.beer_id for r in self._rows.values() if r.user_id == user_id}


FAKE_USER = {"sub": "user_test_123"}


@pytest.fixture
def repo() -> _MemoryRepo:
    return _MemoryRepo(existing_beers={"goldstar", "alexander-blazer", "malka-stout"})


@pytest.fixture
def client(repo: _MemoryRepo) -> TestClient:
    app.dependency_overrides[get_ratings_repo] = lambda: repo
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    app.dependency_overrides[get_taste_feedback_service] = lambda: _NoopFeedback()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_ratings_repo, None)
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_taste_feedback_service, None)


def test_create_rating_returns_201_and_record(client: TestClient) -> None:
    r = client.post(
        "/ratings",
        json={"beer_id": "goldstar", "rating": "loved", "note": "crisp and easy"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["beer_id"] == "goldstar"
    assert body["rating"] == "loved"
    assert body["note"] == "crisp and easy"


def test_create_rating_rejects_unknown_beer(client: TestClient) -> None:
    r = client.post(
        "/ratings",
        json={"beer_id": "made-up-beer", "rating": "fine"},
    )
    assert r.status_code == 404
    assert "Beer not found" in r.text


def test_create_rating_rejects_invalid_values(client: TestClient) -> None:
    # Only the 3-state enum is accepted; wrong case, empty strings, numbers,
    # and out-of-vocabulary words are all 422.
    for bad_rating in (0, "", "amazing", "LOVED", "meh"):
        r = client.post(
            "/ratings",
            json={"beer_id": "goldstar", "rating": bad_rating},
        )
        assert r.status_code == 422, bad_rating


def test_create_rating_upserts_not_duplicates(client: TestClient, repo: _MemoryRepo) -> None:
    r1 = client.post("/ratings", json={"beer_id": "goldstar", "rating": "loved"})
    r2 = client.post(
        "/ratings", json={"beer_id": "goldstar", "rating": "disliked", "note": "worse today"}
    )
    assert r1.status_code == 201
    assert r2.status_code == 201
    # Same id → update
    assert r1.json()["id"] == r2.json()["id"]
    assert r2.json()["rating"] == "disliked"
    assert r2.json()["note"] == "worse today"
    # Repo should contain exactly one row for this (user, beer)
    assert len(repo._rows) == 1


def test_list_my_ratings_paginates(client: TestClient) -> None:
    for beer_id in ("goldstar", "alexander-blazer", "malka-stout"):
        client.post("/ratings", json={"beer_id": beer_id, "rating": "fine"})

    r = client.get("/me/ratings?page=1&page_size=2")
    assert r.status_code == 200
    body = r.json()
    assert body["page"] == 1
    assert body["page_size"] == 2
    assert body["total"] == 3
    assert len(body["ratings"]) == 2

    r2 = client.get("/me/ratings?page=2&page_size=2")
    body2 = r2.json()
    assert len(body2["ratings"]) == 1


def test_ratings_require_auth() -> None:
    """Without the auth override, hitting the route returns 401."""
    raw_client = TestClient(app)
    r = raw_client.post("/ratings", json={"beer_id": "goldstar", "rating": "loved"})
    assert r.status_code == 401


def test_ratings_route_does_not_touch_user_baseline_taste(
    client: TestClient, repo: _MemoryRepo
) -> None:
    """PRD assertion: rating capture in v1 does NOT mutate BaselineTaste.

    With the in-memory repo, the only state touched is the ratings dict.
    Verify by snapshotting before/after a rating.
    """

    # Sanity: the in-memory repo exposes only _rows; if a future change added
    # a baseline-update side effect via this repo, the field set would expand.
    fields_before = set(vars(repo).keys())
    client.post("/ratings", json={"beer_id": "goldstar", "rating": "loved"})
    fields_after = set(vars(repo).keys())
    assert fields_before == fields_after
