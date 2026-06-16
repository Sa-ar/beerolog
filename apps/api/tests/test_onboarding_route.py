"""Tests for the onboarding + BaselineTaste routes (slice #76)."""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.main import app
from app.routes.onboarding import (
    _embedding_client_dep,
    get_baseline_taste_repo,
)
from app.services.baseline_taste_repo import BaselineTasteSnapshot


class _MemoryRepo:
    def __init__(self) -> None:
        self._rows: dict[str, BaselineTasteSnapshot] = {}

    async def get(self, user_id: str) -> BaselineTasteSnapshot | None:
        return self._rows.get(user_id)

    async def save(
        self, *, user_id, bubbles, bitterness, flavor_family, novelty_affinity, embedding
    ) -> BaselineTasteSnapshot:
        snap = BaselineTasteSnapshot(
            user_id=user_id,
            bubbles=bubbles,
            bitterness=bitterness,
            flavor_family=flavor_family,
            novelty_affinity=novelty_affinity,
            embedding=embedding,
            embedding_fresh_at="2026-06-15T00:00:00+00:00",
            updated_at="2026-06-15T00:00:00+00:00",
        )
        self._rows[user_id] = snap
        return snap


class _StubEmbeddingClient:
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def embed(self, text: str) -> list[float]:
        self.calls.append(text)
        # Deterministic 8-D vector that varies with the text
        h = hash(text)
        return [((h >> (i * 4)) & 0xF) / 15.0 for i in range(8)]


FAKE_USER = {"sub": "user_test_456"}

_HOP_HEAD_ANSWERS = {
    "coffee": "black",
    "water": "strong",
    "novelty_seeking": True,
    "snack": "dark_chocolate",
    "sour_foods": "okay",
    "citrus": "grapefruit",
    "smoked_foods": "love",
}


@pytest.fixture
def repo() -> _MemoryRepo:
    return _MemoryRepo()


@pytest.fixture
def embedding_client() -> _StubEmbeddingClient:
    return _StubEmbeddingClient()


@pytest.fixture
def client(repo: _MemoryRepo, embedding_client: _StubEmbeddingClient) -> TestClient:
    app.dependency_overrides[get_baseline_taste_repo] = lambda: repo
    app.dependency_overrides[_embedding_client_dep] = lambda: embedding_client
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_baseline_taste_repo, None)
        app.dependency_overrides.pop(_embedding_client_dep, None)
        app.dependency_overrides.pop(get_current_user, None)


def test_onboarding_persists_dials(client: TestClient, repo: _MemoryRepo) -> None:
    r = client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["user_id"] == FAKE_USER["sub"]
    assert 0.7 < body["bitterness"] <= 1.0
    assert set(body["flavor_family"].keys()) == {
        "malty",
        "hoppy",
        "roasty",
        "fruity",
        "sour",
        "smoky",
    }
    assert FAKE_USER["sub"] in repo._rows


def test_get_my_baseline_taste_404_before_onboarding(client: TestClient) -> None:
    r = client.get("/me/baseline-taste")
    assert r.status_code == 404


def test_get_my_baseline_taste_returns_persisted(client: TestClient) -> None:
    client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    r = client.get("/me/baseline-taste")
    assert r.status_code == 200
    body = r.json()
    assert body["user_id"] == FAKE_USER["sub"]


def test_patch_baseline_taste_updates_only_supplied_fields(
    client: TestClient,
    embedding_client: _StubEmbeddingClient,
) -> None:
    client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    embedding_client.calls.clear()
    r = client.patch("/me/baseline-taste", json={"bubbles": 0.1})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["bubbles"] == pytest.approx(0.1)
    # The patched embedding text should differ from the onboarding text
    assert len(embedding_client.calls) == 1


def test_patch_404_when_not_onboarded(client: TestClient) -> None:
    r = client.patch("/me/baseline-taste", json={"bubbles": 0.5})
    assert r.status_code == 404


def test_onboarding_requires_auth() -> None:
    raw_client = TestClient(app)
    r = raw_client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    assert r.status_code == 401


def test_patch_validates_dial_ranges(client: TestClient) -> None:
    client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    r = client.patch("/me/baseline-taste", json={"bubbles": 1.5})
    assert r.status_code == 422
    r = client.patch("/me/baseline-taste", json={"bitterness": -0.1})
    assert r.status_code == 422
