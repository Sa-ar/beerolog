"""Integration: POST /ratings actually nudges the baseline embedding.

Proves the immediate (card) path is wired end-to-end with the real
TasteFeedbackService over in-memory repos. See docs/prds/beer-rating-feedback.md.
"""

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

FAKE_USER = {"sub": "user_fb"}
BEER = "goldstar"
BEER_EMBEDDING = [0.0, 1.0, 0.0, 0.0]


class _MemoryRatingsRepo:
    def __init__(self) -> None:
        self._rows: dict[tuple[str, str], RatingRow] = {}

    async def beer_exists(self, beer_id: str) -> bool:
        return beer_id == BEER

    async def upsert_rating(
        self, *, user_id, beer_id, rating, note, proof_photo_url=None, proof_source=None
    ) -> RatingRow:
        row = RatingRow(
            id="r1",
            user_id=user_id,
            beer_id=beer_id,
            beer_name="Goldstar",
            beer_brewery="Tempo",
            rating=rating,
            note=note,
            created_at="2026-06-15T00:00:00+00:00",
        )
        self._rows[(user_id, beer_id)] = row
        return row

    async def list_for_user(self, *, user_id, page, page_size) -> list[RatingRow]:
        return [r for r in self._rows.values() if r.user_id == user_id]

    async def count_for_user(self, user_id: str) -> int:
        return sum(1 for r in self._rows.values() if r.user_id == user_id)


class _MemoryBaselineRepo:
    def __init__(self, embedding: list[float]) -> None:
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
        return self.snap if user_id == self.snap.user_id else None

    async def save(self, *, embedding, **fields) -> BaselineTasteSnapshot:
        from dataclasses import replace

        self.snap = replace(self.snap, embedding=embedding)
        return self.snap


class _StubBeerEmbeddings:
    async def get_embedding(self, beer_id: str) -> list[float] | None:
        return BEER_EMBEDDING if beer_id == BEER else None


def _client(baseline: _MemoryBaselineRepo) -> TestClient:
    ratings_repo = _MemoryRatingsRepo()
    service = TasteFeedbackService(
        baseline_repo=baseline,
        beer_embeddings=_StubBeerEmbeddings(),
        ratings_repo=ratings_repo,
        settings=get_settings(),
    )
    app.dependency_overrides[get_ratings_repo] = lambda: ratings_repo
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    app.dependency_overrides[get_taste_feedback_service] = lambda: service
    return TestClient(app)


@pytest.fixture(autouse=True)
def _cleanup():
    yield
    for dep in (get_ratings_repo, get_current_user, get_taste_feedback_service):
        app.dependency_overrides.pop(dep, None)


def test_loved_nudges_baseline_toward_beer() -> None:
    baseline = _MemoryBaselineRepo([1.0, 0.0, 0.0, 0.0])
    before = cosine(baseline.snap.embedding, BEER_EMBEDDING)
    client = _client(baseline)
    r = client.post("/ratings", json={"beer_id": BEER, "rating": "loved"})
    assert r.status_code == 201, r.text
    assert cosine(baseline.snap.embedding, BEER_EMBEDDING) > before


def test_disliked_nudges_baseline_away_from_beer() -> None:
    baseline = _MemoryBaselineRepo([1.0, 1.0, 0.0, 0.0])
    before = cosine(baseline.snap.embedding, BEER_EMBEDDING)
    client = _client(baseline)
    r = client.post("/ratings", json={"beer_id": BEER, "rating": "disliked"})
    assert r.status_code == 201, r.text
    assert cosine(baseline.snap.embedding, BEER_EMBEDDING) < before


def test_fine_leaves_baseline_unchanged() -> None:
    baseline = _MemoryBaselineRepo([1.0, 0.0, 0.0, 0.0])
    original = list(baseline.snap.embedding)
    client = _client(baseline)
    r = client.post("/ratings", json={"beer_id": BEER, "rating": "fine"})
    assert r.status_code == 201, r.text
    assert baseline.snap.embedding == original
