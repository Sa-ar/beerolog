"""Integration tests for the menu-scan REST surface."""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.dependencies import get_deck_catalog
from app.main import app
from app.routes.menu import _vision_client_dep
from app.routes.onboarding import get_baseline_taste_repo
from app.services.baseline_taste_repo import BaselineTasteSnapshot
from app.services.match_engine import BeerCandidate


def _beer(bid: str, name: str, brewery: str, embedding: list[float]) -> BeerCandidate:
    return BeerCandidate(
        id=bid,
        name=name,
        name_hebrew=None,
        brewery=brewery,
        style="lager",
        abv=5.0,
        market_tier="craft",
        color="gold",
        image_url=None,
        adventurousness=0.5,
        embedding=embedding,
    )


# Guinness aligns with the baseline vector below; Heineken is orthogonal.
CATALOG = [
    _beer("1", "Guinness Draught", "Guinness", [1.0, 0.0]),
    _beer("2", "Heineken", "Heineken", [0.0, 1.0]),
]


class _FakeRepo:
    """Baseline-taste repo stub. `snapshot=None` models a user who hasn't onboarded."""

    def __init__(self, snapshot: BaselineTasteSnapshot | None) -> None:
        self._snapshot = snapshot

    async def get(self, user_id: str) -> BaselineTasteSnapshot | None:
        return self._snapshot


def _snapshot(embedding: list[float]) -> BaselineTasteSnapshot:
    return BaselineTasteSnapshot(
        user_id="u1",
        bubbles=0.5,
        bitterness=0.5,
        sweetness=0.5,
        body=0.5,
        abv_affinity=0.5,
        flavor_family={},
        novelty_affinity=0.5,
        embedding=embedding,
        embedding_fresh_at="2026-01-01T00:00:00",
        updated_at="2026-01-01T00:00:00",
    )


class _FakeLLM:
    """Vision-client stub returning a fixed extracted name list."""

    def __init__(self, names: list[str]) -> None:
        self._names = names

    async def extract_beer_names(self, image_base64: str) -> list[str]:
        return self._names


@pytest.fixture(autouse=True)
def _cleanup():
    yield
    for dep in (get_current_user, get_deck_catalog, _vision_client_dep, get_baseline_taste_repo):
        app.dependency_overrides.pop(dep, None)


def _client(names: list[str], baseline: list[float] | None = [1.0, 0.0]) -> TestClient:
    app.dependency_overrides[get_current_user] = lambda: {"sub": "u1"}
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    app.dependency_overrides[_vision_client_dep] = lambda: _FakeLLM(names)
    snap = _snapshot(baseline) if baseline is not None else None
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _FakeRepo(snap)
    return TestClient(app)


def test_scan_matches_catalog_beers():
    r = _client(["Guinness Draught", "Heineken"]).post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert {item["matched_id"] for item in body} == {"1", "2"}
    assert all(not item["needs_review"] for item in body)


def test_scan_ranks_pool_by_taste_and_enriches():
    # Baseline aligns with Guinness → it ranks first and carries the higher fit;
    # the canonical catalog name/brewery is filled in on matched rows.
    r = _client(["Heineken", "Guinness Draught"]).post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert [item["matched_id"] for item in body] == ["1", "2"]  # best taste-fit first
    top = body[0]
    assert top["name"] == "Guinness Draught" and top["brewery"] == "Guinness"
    assert top["taste_fit"] > body[1]["taste_fit"]


def test_scan_degrades_without_baseline():
    # No onboarding yet: scan still matches, just unranked.
    r = _client(["Guinness Draught"], baseline=None).post(
        "/menu/scan", json={"image_base64": "img"}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body[0]["matched_id"] == "1"
    assert body[0]["taste_fit"] is None


def test_scan_flags_unmatched_beer():
    r = _client(["Xyzzy Quantum Stout"]).post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body[0]["matched_id"] is None
    assert body[0]["needs_review"] is True


def test_scan_requires_auth():
    # No auth override and no bearer header -> real get_current_user rejects.
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    app.dependency_overrides[_vision_client_dep] = lambda: _FakeLLM([])
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _FakeRepo(None)
    r = TestClient(app).post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 401


def test_scan_503_without_openai_key(monkeypatch):
    # Real vision dep runs; with no key it returns 503 rather than calling OpenAI.
    from app.routes import menu as menu_module

    monkeypatch.setattr(menu_module.settings, "openai_api_key", "")
    app.dependency_overrides[get_current_user] = lambda: {"sub": "u1"}
    app.dependency_overrides[get_deck_catalog] = lambda: CATALOG
    app.dependency_overrides[get_baseline_taste_repo] = lambda: _FakeRepo(None)
    r = TestClient(app).post("/menu/scan", json={"image_base64": "img"})
    assert r.status_code == 503
