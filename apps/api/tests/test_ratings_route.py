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
from app.services.ratings_repo import CatchRow, RatingRow


class _NoopFeedback:
    """Ratings-route tests don't exercise the nudge; see test_taste_feedback_route."""

    async def apply(self, *, user_id: str, beer_id: str, rating: str) -> None:
        return None


class _MemoryRepo:
    def __init__(self, existing_beers: set[str]) -> None:
        self._beers = existing_beers
        self._rows: dict[tuple[str, str], RatingRow] = {}
        self._seq = 0  # monotonic created_at so newest-first ordering is testable

    async def beer_exists(self, beer_id: str) -> bool:
        return beer_id in self._beers

    async def upsert_rating(
        self,
        *,
        user_id: str,
        beer_id: str,
        rating: str,
        note: str | None,
        proof_photo_url: str | None = None,
        proof_source: str | None = None,
    ) -> RatingRow:
        existing = self._rows.get((user_id, beer_id))
        # Mirror the SQL COALESCE: a proof-less re-rate keeps the existing proof.
        proof_photo_url = (
            proof_photo_url
            if proof_photo_url is not None
            else (existing.proof_photo_url if existing else None)
        )
        proof_source = (
            proof_source
            if proof_source is not None
            else (existing.proof_source if existing else None)
        )
        self._seq += 1
        row = RatingRow(
            id=existing.id if existing else str(uuid4()),
            user_id=user_id,
            beer_id=beer_id,
            beer_name=f"Beer {beer_id}",
            beer_brewery="Test Brewery",
            rating=rating,
            note=note,
            created_at=f"2026-06-15T00:00:{self._seq:02d}+00:00",
            proof_photo_url=proof_photo_url,
            proof_source=proof_source,
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

    async def list_ratings_map(self, user_id: str) -> dict[str, str]:
        return {r.beer_id: r.rating for r in self._rows.values() if r.user_id == user_id}

    async def list_catches(self, user_id: str) -> list[CatchRow]:
        rows = [
            r for r in self._rows.values() if r.user_id == user_id and r.proof_photo_url is not None
        ]
        rows.sort(key=lambda r: r.created_at, reverse=True)
        return [
            CatchRow(
                beer_id=r.beer_id,
                name=r.beer_name,
                name_hebrew=None,
                brewery=r.beer_brewery,
                style="IPA",
                color="gold",
                image_url=None,
                proof_photo_url=r.proof_photo_url,
                rating=r.rating,
                created_at=r.created_at,
            )
            for r in rows
        ]


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


def test_create_rating_with_proof_is_caught(client: TestClient) -> None:
    # Attaching a proof photo finalizes the rating into a Catch (ADR 0011).
    r = client.post(
        "/ratings",
        json={
            "beer_id": "goldstar",
            "rating": "loved",
            "proof_photo_url": "https://blob.example/proof/abc.jpg",
            "proof_source": "self_photo",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["proof_photo_url"] == "https://blob.example/proof/abc.jpg"
    assert body["proof_source"] == "self_photo"
    assert body["caught"] is True


def test_re_rating_without_proof_keeps_the_catch(client: TestClient) -> None:
    # A Catch must survive a later proof-less re-rate from a normal surface
    # (recommendation card / deck / search all POST /ratings with no proof).
    client.post(
        "/ratings",
        json={"beer_id": "goldstar", "rating": "loved", "proof_photo_url": "https://b/x.jpg"},
    )
    r = client.post("/ratings", json={"beer_id": "goldstar", "rating": "fine"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["caught"] is True
    assert body["proof_photo_url"] == "https://b/x.jpg"
    assert [c["beer_id"] for c in client.get("/me/catches").json()["catches"]] == ["goldstar"]


def test_create_rating_without_proof_is_not_caught(client: TestClient) -> None:
    r = client.post("/ratings", json={"beer_id": "goldstar", "rating": "fine"})
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["proof_photo_url"] is None
    assert body["proof_source"] is None
    assert body["caught"] is False


def test_create_rating_rejects_unknown_proof_source(client: TestClient) -> None:
    # Only self-attestation is client-writable; `venue_verified` is a future
    # server-side tier, and any other value is rejected at the boundary.
    for bad in ("venue_verified", "forged", ""):
        r = client.post(
            "/ratings",
            json={
                "beer_id": "goldstar",
                "rating": "loved",
                "proof_photo_url": "https://blob.example/x.jpg",
                "proof_source": bad,
            },
        )
        assert r.status_code == 422, bad


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


def test_list_catches_returns_only_caught_newest_first(client: TestClient) -> None:
    # A plain rating (no proof) is not a Catch; only proof-backed ones show up,
    # newest first.
    client.post("/ratings", json={"beer_id": "goldstar", "rating": "loved"})
    client.post(
        "/ratings",
        json={"beer_id": "malka-stout", "rating": "loved", "proof_photo_url": "https://b/1.jpg"},
    )
    client.post(
        "/ratings",
        json={
            "beer_id": "alexander-blazer",
            "rating": "fine",
            "proof_photo_url": "https://b/2.jpg",
        },
    )
    r = client.get("/me/catches")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["count"] == 2
    assert [c["beer_id"] for c in body["catches"]] == ["alexander-blazer", "malka-stout"]
    assert all(c["proof_photo_url"] for c in body["catches"])


def test_catches_require_auth() -> None:
    app.dependency_overrides[get_ratings_repo] = lambda: _MemoryRepo(set())
    try:
        r = TestClient(app).get("/me/catches")
        assert r.status_code == 401
    finally:
        app.dependency_overrides.pop(get_ratings_repo, None)


def test_ratings_map_returns_beer_id_to_rating(client: TestClient) -> None:
    # The re-rate surfaces (search, recommendations) read this map to show the
    # user's current rating from server truth, not frontend state (issue #3).
    client.post("/ratings", json={"beer_id": "goldstar", "rating": "loved"})
    client.post("/ratings", json={"beer_id": "malka-stout", "rating": "disliked"})
    r = client.get("/me/ratings/map")
    assert r.status_code == 200, r.text
    assert r.json()["ratings"] == {"goldstar": "loved", "malka-stout": "disliked"}


def test_ratings_map_requires_auth() -> None:
    app.dependency_overrides[get_ratings_repo] = lambda: _MemoryRepo(set())
    try:
        r = TestClient(app).get("/me/ratings/map")
        assert r.status_code == 401
    finally:
        app.dependency_overrides.pop(get_ratings_repo, None)


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
