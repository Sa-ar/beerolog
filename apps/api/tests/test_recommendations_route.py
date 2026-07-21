"""Integration test for POST /recommendations.

Uses a stub embedding client so the test runs offline with no OpenAI call.
Verifies the route wires composers → embed → match → why-line correctly
and returns the expected response shape.
"""

from __future__ import annotations

import hashlib

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_optional_user
from app.main import app
from app.routes.onboarding import get_baseline_taste_repo
from app.routes.recommendations import _embedding_client_dep, _why_explainer_dep
from app.services.baseline_taste_repo import BaselineTasteSnapshot
from app.services.why_explainer import NullWhyExplainer, WhyBeerInput


class _StubEmbeddingClient:
    """Returns a deterministic 8-D vector based on a stable hash of the text so
    different inputs produce different outputs without needing OpenAI. Uses
    sha256 (not the builtin hash) so results don't vary with PYTHONHASHSEED."""

    async def embed(self, text: str) -> list[float]:
        digest = hashlib.sha256(text.encode()).digest()
        return [digest[i] / 255.0 for i in range(8)]


class _NullBaselineRepo:
    async def get(self, user_id: str) -> BaselineTasteSnapshot | None:
        return None

    async def save(self, **kwargs) -> BaselineTasteSnapshot:
        raise NotImplementedError


class _MemoryBaselineRepo:
    def __init__(self, snap: BaselineTasteSnapshot) -> None:
        self._snap = snap

    async def get(self, user_id: str) -> BaselineTasteSnapshot | None:
        if user_id == self._snap.user_id:
            return self._snap
        return None

    async def save(self, **kwargs) -> BaselineTasteSnapshot:
        raise NotImplementedError


class _StubWhyExplainer:
    """Returns a distinct why sentence per beer id."""

    async def explain_batch(
        self,
        beers: list[WhyBeerInput],
        *,
        locale: str,
    ) -> dict[str, str | None]:
        return {b.id: f"[{locale}] why for {b.name}" for b in beers}


class _FailingWhyExplainer:
    async def explain_batch(
        self,
        beers: list[WhyBeerInput],
        *,
        locale: str,
    ) -> dict[str, str | None]:
        raise RuntimeError("openai down")


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[_embedding_client_dep] = lambda: _StubEmbeddingClient()
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _NullBaselineRepo()
    app.dependency_overrides[_why_explainer_dep] = lambda: NullWhyExplainer()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(_embedding_client_dep, None)
        app.dependency_overrides.pop(get_baseline_taste_repo, None)
        app.dependency_overrides.pop(_why_explainer_dep, None)
        app.dependency_overrides.pop(get_optional_user, None)


_PAYLOAD = {
    "baseline": {
        "bubbles": 0.8,
        "bitterness": 0.85,
        "flavor_family": {
            "malty": 0.3,
            "hoppy": 0.9,
            "roasty": 0.5,
            "fruity": 0.7,
            "sour": 0.4,
            "smoky": 0.1,
        },
        "novelty_affinity": 0.85,
    },
    "session": {
        "vibe": "adventurous",
        "abv_intent": "medium",
        "free_text": "hot evening, just ate hummus",
    },
}


def test_returns_top_5_with_full_breakdown(client: TestClient) -> None:
    r = client.post("/recommendations", json=_PAYLOAD)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["results"]) == 5
    for beer in body["results"]:
        assert beer["why"]["code"]
        assert isinstance(beer["why"].get("facts"), list)
        assert beer["why"]["facts"], "expected at least one match fact"
        assert beer["color"] in ("pale", "gold", "amber", "brown", "dark")
        breakdown = beer["breakdown"]
        for k in (
            "baseline_cos",
            "session_cos",
            "baseline_score",
            "session_score",
            "abv_score",
            "abv_fits_intent",
            "novelty_score",
            "total_score",
            "dominant_component",
        ):
            assert k in breakdown


def test_results_include_ibu_and_adventurousness(client: TestClient) -> None:
    """The detail-view radar needs bitterness (from ibu) and adventurousness on
    the wire. ibu is nullable; adventurousness is always a 0..1 float."""
    r = client.post("/recommendations", json=_PAYLOAD)
    assert r.status_code == 200, r.text
    for beer in r.json()["results"]:
        assert "ibu" in beer, "ibu key must be present (may be null)"
        assert beer["ibu"] is None or isinstance(beer["ibu"], (int, float))
        assert isinstance(beer["adventurousness"], (int, float))
        assert 0.0 <= beer["adventurousness"] <= 1.0


def test_session_uses_lower_default_alpha(client: TestClient) -> None:
    r = client.post("/recommendations", json=_PAYLOAD)
    body = r.json()
    assert body["alpha"] == 0.4


def test_returns_calibration_anchors(client: TestClient) -> None:
    r = client.post("/recommendations", json=_PAYLOAD)
    body = r.json()
    assert body["calibration"]["cos_floor"] == 0.2
    assert body["calibration"]["cos_ceiling"] == 0.5


def test_returns_alpha_and_beta_used(client: TestClient) -> None:
    payload = {**_PAYLOAD, "alpha": 0.3, "beta": 0.0}
    r = client.post("/recommendations", json=payload)
    body = r.json()
    assert body["alpha"] == 0.3
    assert body["beta"] == 0.0


def test_skip_session_intent_path(client: TestClient) -> None:
    payload = {**_PAYLOAD}
    payload.pop("session")
    r = client.post("/recommendations", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["alpha"] == 0.6
    for beer in body["results"]:
        assert beer["why"]["code"] in (
            "baseline",
            "novelty_positive",
            "novelty_negative",
        )


def test_uses_persisted_baseline_embedding_when_authenticated(client: TestClient) -> None:
    anon = client.post("/recommendations", json=_PAYLOAD)
    assert anon.status_code == 200
    anon_ids = [b["id"] for b in anon.json()["results"]]

    stored_embedding = [1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
    snap = BaselineTasteSnapshot(
        user_id="user_test",
        bubbles=0.1,
        bitterness=0.1,
        sweetness=0.5,
        body=0.5,
        abv_affinity=0.5,
        flavor_family={
            "malty": 0.1,
            "hoppy": 0.1,
            "roasty": 0.1,
            "fruity": 0.1,
            "sour": 0.1,
            "smoky": 0.1,
        },
        novelty_affinity=0.15,
        embedding=stored_embedding,
        embedding_fresh_at="2026-06-15T00:00:00+00:00",
        updated_at="2026-06-15T00:00:00+00:00",
    )
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _MemoryBaselineRepo(snap)
    app.dependency_overrides[get_optional_user] = lambda: {"sub": "user_test"}

    authed = client.post("/recommendations", json=_PAYLOAD)
    assert authed.status_code == 200
    authed_ids = [b["id"] for b in authed.json()["results"]]
    assert anon_ids != authed_ids


def test_authed_sessionless_applies_baseline_abv_band(client: TestClient) -> None:
    payload = {k: v for k, v in _PAYLOAD.items() if k != "session"}

    anon = client.post("/recommendations", json=payload)
    assert anon.status_code == 200
    assert all(b["breakdown"]["abv_score"] == 0 for b in anon.json()["results"])

    snap = BaselineTasteSnapshot(
        user_id="user_test",
        bubbles=0.1,
        bitterness=0.1,
        sweetness=0.5,
        body=0.5,
        abv_affinity=0.1,
        flavor_family={
            "malty": 0.1,
            "hoppy": 0.1,
            "roasty": 0.1,
            "fruity": 0.1,
            "sour": 0.1,
            "smoky": 0.1,
        },
        novelty_affinity=0.15,
        embedding=[1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        embedding_fresh_at="2026-06-15T00:00:00+00:00",
        updated_at="2026-06-15T00:00:00+00:00",
    )
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _MemoryBaselineRepo(snap)
    app.dependency_overrides[get_optional_user] = lambda: {"sub": "user_test"}
    try:
        authed = client.post("/recommendations", json=payload)
        assert authed.status_code == 200
        assert any(b["breakdown"]["abv_score"] != 0 for b in authed.json()["results"])
    finally:
        app.dependency_overrides[get_baseline_taste_repo] = lambda: _NullBaselineRepo()
        app.dependency_overrides.pop(get_optional_user, None)


def test_503_when_openai_key_missing(monkeypatch) -> None:
    """Without the dependency_overrides fixture, the live dep should 503."""
    from app.config import settings

    monkeypatch.setattr(settings, "openai_api_key", "")
    raw_client = TestClient(app)
    r = raw_client.post("/recommendations", json=_PAYLOAD)
    assert r.status_code == 503
    assert "OPENAI_API_KEY" in r.text


def test_llm_why_text_differs_across_beers_and_respects_locale(client: TestClient) -> None:
    app.dependency_overrides[_why_explainer_dep] = lambda: _StubWhyExplainer()
    r = client.post("/recommendations", json={**_PAYLOAD, "locale": "he"})
    assert r.status_code == 200, r.text
    results = r.json()["results"]
    texts = [b["why"]["text"] for b in results]
    assert all(t and t.startswith("[he] why for ") for t in texts)
    assert len(set(texts)) == len(texts)


def test_why_explainer_failure_falls_back_to_template_codes(client: TestClient) -> None:
    app.dependency_overrides[_why_explainer_dep] = lambda: _FailingWhyExplainer()
    r = client.post("/recommendations", json=_PAYLOAD)
    assert r.status_code == 200, r.text
    for beer in r.json()["results"]:
        assert beer["why"]["code"]
        assert beer["why"].get("text") is None
        assert beer["why"]["facts"]
