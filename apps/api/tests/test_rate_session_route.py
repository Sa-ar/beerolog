"""Integration: POST /rate/session persists swipes and applies ONE batch nudge."""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.config import get_settings
from app.dependencies import get_taste_feedback_service
from app.main import app
from app.routes.ratings import get_ratings_repo
from app.services.baseline_taste_repo import BaselineTasteSnapshot
from app.services.match_engine import cosine
from app.services.ratings_repo import RatingRow
from app.services.taste_feedback_service import TasteFeedbackService

FAKE_USER = {"sub": "user_sess"}
EMB = {"A": [0.0, 1.0, 0.0, 0.0], "B": [0.0, 0.0, 0.0, 1.0], "C": [0.0, 0.0, 1.0, 0.0]}


class _RatingsRepo:
    def __init__(self) -> None:
        self.rows: dict[tuple[str, str], RatingRow] = {}

    async def beer_exists(self, beer_id: str) -> bool:
        return beer_id in EMB

    async def upsert_rating(self, *, user_id, beer_id, rating, note) -> RatingRow:
        row = RatingRow(
            id=beer_id,
            user_id=user_id,
            beer_id=beer_id,
            beer_name=beer_id,
            beer_brewery="b",
            rating=rating,
            note=note,
            created_at="2026-06-15T00:00:00+00:00",
        )
        self.rows[(user_id, beer_id)] = row
        return row

    async def count_for_user(self, user_id: str) -> int:
        return sum(1 for r in self.rows.values() if r.user_id == user_id)


class _BaselineRepo:
    def __init__(self, embedding: list[float]) -> None:
        self.save_count = 0
        self.snap = BaselineTasteSnapshot(
            user_id=FAKE_USER["sub"],
            bubbles=0.5,
            bitterness=0.5,
            sweetness=0.5,
            body=0.5,
            abv_affinity=0.5,
            flavor_family={"malty": 0.5},
            novelty_affinity=0.5,
            embedding=embedding,
            embedding_fresh_at="2026-06-01T00:00:00+00:00",
            updated_at="2026-06-01T00:00:00+00:00",
            model_version=2,
        )

    async def get(self, user_id: str) -> BaselineTasteSnapshot | None:
        return self.snap

    async def save(self, *, embedding, **fields) -> BaselineTasteSnapshot:
        from dataclasses import replace

        self.save_count += 1
        self.snap = replace(self.snap, embedding=embedding)
        return self.snap


class _BeerEmbeddings:
    async def get_embedding(self, beer_id: str) -> list[float] | None:
        return EMB.get(beer_id)


def _client(baseline: _BaselineRepo) -> TestClient:
    ratings_repo = _RatingsRepo()
    service = TasteFeedbackService(
        baseline_repo=baseline,
        beer_embeddings=_BeerEmbeddings(),
        ratings_repo=ratings_repo,
        settings=get_settings(),
    )
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    app.dependency_overrides[get_ratings_repo] = lambda: ratings_repo
    app.dependency_overrides[get_taste_feedback_service] = lambda: service
    return TestClient(app), ratings_repo


@pytest.fixture(autouse=True)
def _cleanup():
    yield
    for dep in (get_current_user, get_ratings_repo, get_taste_feedback_service):
        app.dependency_overrides.pop(dep, None)


def test_session_records_all_and_applies_one_combined_nudge() -> None:
    baseline = _BaselineRepo([1.0, 0.0, 0.0, 0.0])
    before_a = cosine(baseline.snap.embedding, EMB["A"])
    before_c = cosine(baseline.snap.embedding, EMB["C"])
    client, ratings_repo = _client(baseline)
    r = client.post(
        "/rate/session",
        json={
            "swipes": [
                {"beer_id": "A", "rating": "loved"},
                {"beer_id": "B", "rating": "fine", "note": "meh"},
                {"beer_id": "C", "rating": "disliked"},
            ]
        },
    )
    assert r.status_code == 200, r.text
    assert r.json()["recorded"] == 3
    # one combined save, not one per swipe
    assert baseline.save_count == 1
    assert cosine(baseline.snap.embedding, EMB["A"]) > before_a
    assert cosine(baseline.snap.embedding, EMB["C"]) < before_c
    # all three persisted (incl. the fine swipe)
    assert len(ratings_repo.rows) == 3


def test_session_records_unknown_rating_without_nudging() -> None:
    # "I don't know this beer" (#219): persisted so it drops out of future decks,
    # but the taste profile is left untouched.
    baseline = _BaselineRepo([1.0, 0.0, 0.0, 0.0])
    before = list(baseline.snap.embedding)
    client, ratings_repo = _client(baseline)
    r = client.post(
        "/rate/session",
        json={"swipes": [{"beer_id": "A", "rating": "unknown"}]},
    )
    assert r.status_code == 200, r.text
    assert r.json()["recorded"] == 1
    assert len(ratings_repo.rows) == 1
    assert next(iter(ratings_repo.rows.values())).rating == "unknown"
    assert baseline.snap.embedding == before


def test_session_skips_unknown_beers() -> None:
    baseline = _BaselineRepo([1.0, 0.0, 0.0, 0.0])
    client, ratings_repo = _client(baseline)
    r = client.post(
        "/rate/session",
        json={"swipes": [{"beer_id": "nope", "rating": "loved"}]},
    )
    assert r.status_code == 200, r.text
    assert r.json()["recorded"] == 0
    assert len(ratings_repo.rows) == 0
