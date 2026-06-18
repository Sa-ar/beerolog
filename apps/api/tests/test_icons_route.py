"""Tests for GET /icons/catalog."""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from beerolog_icon_service.curated_icons import CURATED_SVGS
from beerolog_icon_service.models import IconRecord
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.main import app
from app.routes.icons import _icon_generator_dep
from app.routes.onboarding import get_icon_repo

VALID_SVG = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="8"/></svg>'


class _MemoryIconRepo:
    def __init__(self) -> None:
        self._rows: dict[str, IconRecord] = {}

    async def find_by_purpose(self, purpose: str) -> IconRecord | None:
        return self._rows.get(purpose)

    async def insert_or_get(
        self, *, purpose: str, description: str, svg_content: str
    ) -> IconRecord:
        existing = self._rows.get(purpose)
        if existing is not None:
            return existing
        record = IconRecord(
            id=f"id-{purpose}",
            purpose=purpose,
            description=description,
            svg_content=svg_content,
            created_at="2026-06-17T00:00:00+00:00",
        )
        self._rows[purpose] = record
        return record

    async def upsert(self, *, purpose: str, description: str, svg_content: str) -> IconRecord:
        record = IconRecord(
            id=f"id-{purpose}",
            purpose=purpose,
            description=description,
            svg_content=svg_content,
            created_at="2026-06-17T00:00:00+00:00",
        )
        self._rows[purpose] = record
        return record


class _StubIconGenerator:
    async def generate_svg(self, description: str) -> str:
        return VALID_SVG


@pytest.fixture
def client() -> TestClient:
    app.dependency_overrides[get_icon_repo] = lambda: _MemoryIconRepo()
    app.dependency_overrides[_icon_generator_dep] = lambda: _StubIconGenerator()
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_icon_repo, None)
        app.dependency_overrides.pop(_icon_generator_dep, None)


def test_get_icon_catalog_returns_grouped_curated_icons(client: TestClient) -> None:
    r = client.get("/icons/catalog")
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body["session_vibes"]) == 4
    assert len(body["session_abv"]) == 4
    assert len(body["journey"]) == 3
    assert len(body["flavors"]) == 6
    assert len(body["marketing"]) == 1

    sour = next(item for item in body["flavors"] if item["key"] == "sour")
    assert "hsl(48 96% 58%)" in sour["svg"]
    assert sour["svg"] == CURATED_SVGS["taste-profile:flavor:sour"]


def test_get_icon_catalog_works_without_generator() -> None:
    app.dependency_overrides[get_icon_repo] = lambda: _MemoryIconRepo()
    app.dependency_overrides[_icon_generator_dep] = lambda: None
    try:
        r = TestClient(app).get("/icons/catalog")
        assert r.status_code == 200
        body = r.json()
        assert len(body["session_vibes"]) == 4
        assert len(body["flavors"]) == 6
    finally:
        app.dependency_overrides.pop(get_icon_repo, None)
        app.dependency_overrides.pop(_icon_generator_dep, None)
