"""Integration test for POST /recommendations.

Uses a stub embedding client so the test runs offline with no OpenAI call.
Verifies the route wires composers → embed → match → why-line correctly
and returns the expected response shape.
"""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.main import app
from app.routes.recommendations import _embedding_client_dep


class _StubEmbeddingClient:
    """Returns a deterministic 8-D vector based on a hash of the text so
    different inputs produce different outputs without needing OpenAI."""

    async def embed(self, text: str) -> list[float]:
        # 8 dimensions matching the placeholder catalog axes
        h = hash(text)
        return [((h >> (i * 4)) & 0xF) / 15.0 for i in range(8)]


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[_embedding_client_dep] = lambda: _StubEmbeddingClient()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(_embedding_client_dep, None)


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
        assert beer["why_line"]
        breakdown = beer["breakdown"]
        for k in (
            "baseline_score",
            "session_score",
            "novelty_score",
            "total_score",
            "dominant_component",
        ):
            assert k in breakdown


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
    # Every why-line should match the baseline-only template family
    for beer in body["results"]:
        assert beer["why_line"] in (
            "Matches your usual style.",
            "A bolder pick than usual — you said you wanted to explore.",
            "A safe familiar choice — close to what you normally like.",
        )


def test_503_when_openai_key_missing(monkeypatch) -> None:
    """Without the dependency_overrides fixture, the live dep should 503."""
    from app.config import settings

    monkeypatch.setattr(settings, "openai_api_key", "")
    raw_client = TestClient(app)
    r = raw_client.post("/recommendations", json=_PAYLOAD)
    assert r.status_code == 503
    assert "OPENAI_API_KEY" in r.text
