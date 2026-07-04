"""Integration: GET /rate/deck returns a deck excluding already-rated beers."""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.dependencies import get_deck_catalog
from app.main import app
from app.routes.onboarding import get_baseline_taste_repo
from app.routes.ratings import get_ratings_repo
from app.services.baseline_taste_repo import BaselineTasteSnapshot
from app.services.match_engine import BeerCandidate

FAKE_USER = {"sub": "user_deck"}


def _beer(i: int) -> BeerCandidate:
    vec = [0.0, 0.0, 0.0, 0.0]
    vec[i % 4] = 1.0
    vec[(i + 1) % 4] = 0.1 * (i + 1)
    return BeerCandidate(
        id=f"b{i}",
        name=f"Beer {i}",
        name_hebrew=None,
        brewery="Brew",
        style="lager",
        abv=5.0,
        market_tier="mainstream",
        color="gold",
        image_url=None,
        adventurousness=0.5,
        embedding=vec,
    )


CATALOG = [_beer(i) for i in range(15)]


class _RatingsRepo:
    def __init__(self, rated: set[str]) -> None:
        self._rated = rated

    async def list_rated_beer_ids(self, user_id: str) -> set[str]:
        return self._rated


class _BaselineRepo:
    def __init__(self, snap: BaselineTasteSnapshot | None) -> None:
        self._snap = snap

    async def get(self, user_id: str) -> BaselineTasteSnapshot | None:
        return self._snap


def _snap(embedding: list[float]) -> BaselineTasteSnapshot:
    return BaselineTasteSnapshot(
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


def _client(*, rated: set[str], snap: BaselineTasteSnapshot | None) -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    app.dependency_overrides[get_ratings_repo] = lambda: _RatingsRepo(rated)
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _BaselineRepo(snap)
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    return TestClient(app)


@pytest.fixture(autouse=True)
def _cleanup():
    yield
    for dep in (get_current_user, get_ratings_repo, get_baseline_taste_repo, get_deck_catalog):
        app.dependency_overrides.pop(dep, None)


def test_deck_excludes_rated_and_caps_size_cold_start() -> None:
    client = _client(rated={"b0", "b1"}, snap=None)
    r = client.get("/rate/deck")
    assert r.status_code == 200, r.text
    ids = [b["id"] for b in r.json()["beers"]]
    assert "b0" not in ids and "b1" not in ids
    assert len(ids) == 12  # deck_size default, 13 available
    assert len(ids) == len(set(ids))


def test_deck_with_baseline_excludes_rated() -> None:
    client = _client(rated={"b2"}, snap=_snap([1.0, 0.0, 0.0, 0.0]))
    r = client.get("/rate/deck")
    assert r.status_code == 200, r.text
    ids = [b["id"] for b in r.json()["beers"]]
    assert "b2" not in ids
    assert len(ids) == 12


def test_deck_requires_auth() -> None:
    # No get_current_user override -> real auth rejects.
    app.dependency_overrides[get_ratings_repo] = lambda: _RatingsRepo(set())
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _BaselineRepo(None)
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    try:
        r = TestClient(app).get("/rate/deck")
        assert r.status_code == 401
    finally:
        for dep in (get_ratings_repo, get_baseline_taste_repo, get_deck_catalog):
            app.dependency_overrides.pop(dep, None)
