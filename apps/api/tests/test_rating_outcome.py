"""Outcome-signal endpoint tests (#350). Auth + setter injected."""

from __future__ import annotations

from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.main import app
from app.routes.rating_outcome import get_outcome_setter


def _client(updated: bool, calls: list) -> TestClient:
    async def setter(user_id, beer_id, outcome, venue_id):
        calls.append((user_id, beer_id, outcome, venue_id))
        return updated

    app.dependency_overrides[get_current_user] = lambda: {"sub": "user_1"}
    app.dependency_overrides[get_outcome_setter] = lambda: setter
    return TestClient(app)


def _cleanup():
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_outcome_setter, None)


def test_sets_outcome_on_the_users_rating():
    calls: list = []
    r = _client(True, calls).post(
        "/ratings/outcome",
        json={"beer_id": "b1", "outcome": "not_what_expected", "venue_id": "v1"},
    )
    _cleanup()
    assert r.status_code == 204
    assert calls == [("user_1", "b1", "not_what_expected", "v1")]


def test_404_when_no_rating_exists():
    r = _client(False, []).post(
        "/ratings/outcome", json={"beer_id": "b1", "outcome": "as_expected"}
    )
    _cleanup()
    assert r.status_code == 404


def test_rejects_invalid_outcome():
    r = _client(True, []).post("/ratings/outcome", json={"beer_id": "b1", "outcome": "meh"})
    _cleanup()
    assert r.status_code == 422
