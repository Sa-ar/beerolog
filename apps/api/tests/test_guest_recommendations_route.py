"""Integration test for POST /guest-recommendations.

The guest endpoint is PUBLIC and OpenAI-free: it scores the placeholder
catalog (or DB catalog) purely in dial space via dial_match.rank_by_dials.
It must succeed even when OPENAI_API_KEY is unset — the authed
/recommendations path 503s in that case, the guest path must not.
"""

from __future__ import annotations

from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.config import settings
from app.main import app
from app.routes import guest_recommendations as guest_route
from app.services.match_engine import BeerCandidate

_PAYLOAD = {
    "coffee": "black",
    "water": "strong",
    "sour_foods": "okay",
    "smoked_foods": "okay",
    "sweet_tooth": "balanced",
    "strength": "medium",
    "adventure": "high",
}


def test_returns_results_and_unlocked_count() -> None:
    raw = TestClient(app)
    r = raw.post("/guest-recommendations", json=_PAYLOAD)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["unlocked_count"] == settings.guest_unlocked_count
    assert len(body["results"]) > 0
    assert len(body["results"]) <= settings.guest_top_k
    for beer in body["results"]:
        assert isinstance(beer["match_percent"], int)
        assert 0 <= beer["match_percent"] <= 100
        assert beer["why"]
        assert beer["id"]
        assert beer["name"]


def test_no_openai_still_succeeds(monkeypatch) -> None:
    """Guest path must NOT depend on OpenAI; succeeds with empty key."""
    monkeypatch.setattr(settings, "openai_api_key", "")
    raw = TestClient(app)
    r = raw.post("/guest-recommendations", json=_PAYLOAD)
    assert r.status_code == 200, r.text


def test_works_with_database_url_unset(monkeypatch) -> None:
    """Falls back to the placeholder catalog when no DB is configured."""
    monkeypatch.setattr(settings, "database_url", "")
    raw = TestClient(app)
    r = raw.post("/guest-recommendations", json=_PAYLOAD)
    assert r.status_code == 200, r.text
    assert len(r.json()["results"]) > 0


class _FakeClient:
    """Counts embed calls so we can assert the cache served the second hit."""

    def __init__(self) -> None:
        self.calls = 0

    async def embed(self, text: str) -> list[float]:
        self.calls += 1
        return [1.0] + [0.0] * 1535


def _embedded_catalog() -> list[BeerCandidate]:
    return [
        BeerCandidate(
            id="b1",
            name="Test Lager",
            brewery="Acme",
            style="lager",
            abv=5.0,
            market_tier="craft",
            color="gold",
            image_url=None,
            adventurousness=0.3,
            embedding=[1.0] + [0.0] * 1535,
        )
    ]


def test_embedding_path_uses_cache(monkeypatch) -> None:
    """With a client + embedded catalog, identical answers embed once, then cache."""
    guest_route._EMBED_CACHE.clear()
    fake = _FakeClient()

    async def _load() -> list[BeerCandidate]:
        return _embedded_catalog()

    monkeypatch.setattr(guest_route, "_load_catalog", _load)
    app.dependency_overrides[guest_route._optional_embedding_client] = lambda: fake
    try:
        raw = TestClient(app)
        first = raw.post("/guest-recommendations", json=_PAYLOAD)
        second = raw.post("/guest-recommendations", json=_PAYLOAD)
    finally:
        app.dependency_overrides.pop(guest_route._optional_embedding_client, None)

    assert first.status_code == 200, first.text
    assert second.status_code == 200, second.text
    assert first.json()["results"][0]["id"] == "b1"
    assert fake.calls == 1  # second request was a cache hit


def test_low_dim_catalog_falls_back_to_dials(monkeypatch) -> None:
    """Toy/placeholder embeddings (wrong dim) must dial-score, not cosine-match."""
    guest_route._EMBED_CACHE.clear()
    fake = _FakeClient()

    async def _load() -> list[BeerCandidate]:
        beer = _embedded_catalog()[0]
        return [BeerCandidate(**{**beer.__dict__, "embedding": [0.7, 0.3, 0.5]})]

    monkeypatch.setattr(guest_route, "_load_catalog", _load)
    app.dependency_overrides[guest_route._optional_embedding_client] = lambda: fake
    try:
        r = TestClient(app).post("/guest-recommendations", json=_PAYLOAD)
    finally:
        app.dependency_overrides.pop(guest_route._optional_embedding_client, None)

    assert r.status_code == 200, r.text
    assert fake.calls == 0  # never embedded -> dial path
    assert r.json()["results"][0]["match_percent"] >= 0


def test_over_embed_budget_falls_back_to_dials(monkeypatch) -> None:
    """When the paid-embed budget is spent, guests dial-score (no API call)."""
    guest_route._EMBED_CACHE.clear()
    monkeypatch.setattr(guest_route, "_EMBED_BUDGET", 0)
    monkeypatch.setattr(guest_route, "_embed_window_start", 0.0)
    monkeypatch.setattr(guest_route, "_embed_window_count", 0)
    fake = _FakeClient()

    async def _load() -> list[BeerCandidate]:
        return _embedded_catalog()

    monkeypatch.setattr(guest_route, "_load_catalog", _load)
    app.dependency_overrides[guest_route._optional_embedding_client] = lambda: fake
    try:
        r = TestClient(app).post("/guest-recommendations", json=_PAYLOAD)
    finally:
        app.dependency_overrides.pop(guest_route._optional_embedding_client, None)

    assert r.status_code == 200, r.text
    assert fake.calls == 0  # budget exhausted -> never embedded
    assert len(r.json()["results"]) > 0  # still served via dial scoring


def test_oversized_multiselect_returns_422() -> None:
    """max_length bounds the public payload: a dup-stuffed list is rejected."""
    raw = TestClient(app)
    payload = {**_PAYLOAD, "avoids": ["too_bitter"] * 9}
    r = raw.post("/guest-recommendations", json=payload)
    assert r.status_code == 422


def test_malformed_answers_returns_422() -> None:
    raw = TestClient(app)
    r = raw.post("/guest-recommendations", json={"coffee": "not_a_real_value"})
    assert r.status_code == 422


def test_missing_answers_returns_422() -> None:
    raw = TestClient(app)
    r = raw.post("/guest-recommendations", json={})
    assert r.status_code == 422
