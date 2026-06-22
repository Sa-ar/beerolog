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


def test_malformed_answers_returns_422() -> None:
    raw = TestClient(app)
    r = raw.post("/guest-recommendations", json={"coffee": "not_a_real_value"})
    assert r.status_code == 422


def test_missing_answers_returns_422() -> None:
    raw = TestClient(app)
    r = raw.post("/guest-recommendations", json={})
    assert r.status_code == 422
