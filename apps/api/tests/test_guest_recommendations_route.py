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


def test_response_includes_archetype_key() -> None:
    raw = TestClient(app)
    r = raw.post("/guest-recommendations", json=_PAYLOAD)
    assert r.status_code == 200, r.text
    from app.api_contracts import ArchetypeKey

    key = r.json()["archetype"]["key"]
    assert key in {k.value for k in ArchetypeKey}


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
    monkeypatch.setattr(guest_route, "_EMBED_BUDGET", guest_route._RateBudget(0))
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


def test_db_cache_hit_serves_without_embedding(monkeypatch) -> None:
    """A vector already in the DB cache is served without any OpenAI call."""
    guest_route._EMBED_CACHE.clear()
    fake = _FakeClient()
    cached_vec = [1.0] + [0.0] * 1535

    async def _load() -> list[BeerCandidate]:
        return _embedded_catalog()

    async def _fake_pool():
        return object()

    async def _get(pool, key):
        return cached_vec

    monkeypatch.setattr(settings, "database_url", "postgres://test")
    monkeypatch.setattr(guest_route, "_load_catalog", _load)
    monkeypatch.setattr(guest_route, "get_pool", _fake_pool)
    monkeypatch.setattr(guest_route.embed_cache_repo, "get", _get)
    app.dependency_overrides[guest_route._optional_embedding_client] = lambda: fake
    try:
        r = TestClient(app).post("/guest-recommendations", json=_PAYLOAD)
    finally:
        app.dependency_overrides.pop(guest_route._optional_embedding_client, None)

    assert r.status_code == 200, r.text
    assert fake.calls == 0  # served from DB L2, OpenAI never called
    assert r.json()["results"][0]["id"] == "b1"


def test_db_cache_write_through_on_miss(monkeypatch) -> None:
    """A DB miss embeds once and writes the vector through to the DB cache."""
    guest_route._EMBED_CACHE.clear()
    monkeypatch.setattr(guest_route, "_EMBED_BUDGET", guest_route._RateBudget(60))
    fake = _FakeClient()
    puts: list[str] = []

    async def _load() -> list[BeerCandidate]:
        return _embedded_catalog()

    async def _fake_pool():
        return object()

    async def _get(pool, key):
        return None

    async def _put(pool, key, vec):
        puts.append(key)

    monkeypatch.setattr(settings, "database_url", "postgres://test")
    monkeypatch.setattr(guest_route, "_load_catalog", _load)
    monkeypatch.setattr(guest_route, "get_pool", _fake_pool)
    monkeypatch.setattr(guest_route.embed_cache_repo, "get", _get)
    monkeypatch.setattr(guest_route.embed_cache_repo, "put", _put)
    app.dependency_overrides[guest_route._optional_embedding_client] = lambda: fake
    try:
        r = TestClient(app).post("/guest-recommendations", json=_PAYLOAD)
    finally:
        app.dependency_overrides.pop(guest_route._optional_embedding_client, None)

    assert r.status_code == 200, r.text
    assert fake.calls == 1  # embedded once on the DB miss
    assert len(puts) == 1 and len(puts[0]) == 64  # written through, sha256 hex key


def test_records_guest_submission(monkeypatch) -> None:
    """Each free submission is recorded anonymously, tagged source='free'."""
    guest_route._EMBED_CACHE.clear()
    recorded: list[tuple] = []

    async def _fake_pool():
        return object()

    async def _record(pool, *, answers, shown_beer_ids, source="free"):
        recorded.append((answers, shown_beer_ids, source))

    monkeypatch.setattr(settings, "database_url", "postgres://test")
    monkeypatch.setattr(guest_route, "get_pool", _fake_pool)
    monkeypatch.setattr(guest_route.guest_submission_repo, "record", _record)

    r = TestClient(app).post("/guest-recommendations", json=_PAYLOAD)
    assert r.status_code == 200, r.text
    assert len(recorded) == 1
    answers, shown, source = recorded[0]
    assert source == "free"
    assert answers["coffee"] == "black"  # the raw submission is stored
    assert shown == [b["id"] for b in r.json()["results"]]  # what we showed


def test_over_record_budget_skips_write(monkeypatch) -> None:
    """When the per-worker submission budget is spent, recording is skipped."""
    recorded: list[tuple] = []

    async def _fake_pool():
        return object()

    async def _record(pool, *, answers, shown_beer_ids, source="free"):
        recorded.append((answers, shown_beer_ids))

    monkeypatch.setattr(settings, "database_url", "postgres://test")
    monkeypatch.setattr(guest_route, "_RECORD_BUDGET", guest_route._RateBudget(0))
    monkeypatch.setattr(guest_route, "get_pool", _fake_pool)
    monkeypatch.setattr(guest_route.guest_submission_repo, "record", _record)

    r = TestClient(app).post("/guest-recommendations", json=_PAYLOAD)
    assert r.status_code == 200, r.text
    assert recorded == []  # budget exhausted -> no DB write


def test_singleflight_collapses_concurrent_misses(monkeypatch) -> None:
    """Two concurrent cold misses of the same combo share one OpenAI call."""
    import asyncio

    guest_route._EMBED_CACHE.clear()
    monkeypatch.setattr(settings, "database_url", "")  # skip L2
    monkeypatch.setattr(guest_route, "_EMBED_BUDGET", guest_route._RateBudget(60))
    calls = {"n": 0}

    class _SlowClient:
        async def embed(self, text):
            calls["n"] += 1
            await asyncio.sleep(0.05)  # keep both requests in-flight
            return [1.0] + [0.0] * 1535

    async def _run():
        c = _SlowClient()
        return await asyncio.gather(
            guest_route._cached_embed("same text", c),
            guest_route._cached_embed("same text", c),
        )

    results = asyncio.run(_run())
    assert calls["n"] == 1  # singleflight: one embed for two concurrent misses
    assert results[0] == results[1]


def test_l1_key_namespaced_by_model(monkeypatch) -> None:
    """Changing the embedding model invalidates L1 (no stale-vector hit)."""
    import asyncio

    guest_route._EMBED_CACHE.clear()
    monkeypatch.setattr(settings, "database_url", "")
    monkeypatch.setattr(guest_route, "_EMBED_BUDGET", guest_route._RateBudget(60))
    calls = {"n": 0}

    class _C:
        async def embed(self, text):
            calls["n"] += 1
            return [1.0] + [0.0] * 1535

    c = _C()
    asyncio.run(guest_route._cached_embed("t", c))
    monkeypatch.setattr(settings, "embedding_model", "different-model")
    asyncio.run(guest_route._cached_embed("t", c))
    assert calls["n"] == 2  # different model -> different key -> re-embed, not stale L1


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
