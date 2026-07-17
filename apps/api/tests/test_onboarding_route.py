"""Tests for the onboarding + BaselineTaste routes (slice #76)."""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]
from beerolog_icon_service.curated_icons import get_curated_svg
from beerolog_icon_service.models import IconRecord
from fastapi.testclient import TestClient  # type: ignore[import-not-found]

from app.auth import get_current_user
from app.main import app
from app.routes.onboarding import (
    _embedding_client_dep,
    _icon_generator_dep,
    _persona_generator_dep,
    get_baseline_taste_repo,
    get_icon_repo,
)
from app.services.baseline_taste import TASTE_MODEL_VERSION
from app.services.baseline_taste_repo import BaselineTasteSnapshot
from app.services.persona import Persona

VALID_SVG = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="8"/></svg>'


class _MemoryRepo:
    def __init__(self) -> None:
        self._rows: dict[str, BaselineTasteSnapshot] = {}

    async def get(self, user_id: str) -> BaselineTasteSnapshot | None:
        return self._rows.get(user_id)

    async def save(
        self,
        *,
        user_id,
        bubbles,
        bitterness,
        sweetness,
        body,
        abv_affinity,
        flavor_family,
        novelty_affinity,
        embedding,
        model_version,
        persona_title_en=None,
        persona_blurb_en=None,
        persona_title_he=None,
        persona_blurb_he=None,
    ) -> BaselineTasteSnapshot:
        snap = BaselineTasteSnapshot(
            user_id=user_id,
            bubbles=bubbles,
            bitterness=bitterness,
            sweetness=sweetness,
            body=body,
            abv_affinity=abv_affinity,
            flavor_family=flavor_family,
            novelty_affinity=novelty_affinity,
            embedding=embedding,
            embedding_fresh_at="2026-06-15T00:00:00+00:00",
            updated_at="2026-06-15T00:00:00+00:00",
            model_version=model_version,
            persona_title_en=persona_title_en,
            persona_blurb_en=persona_blurb_en,
            persona_title_he=persona_title_he,
            persona_blurb_he=persona_blurb_he,
        )
        self._rows[user_id] = snap
        return snap


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


class _FailingIconRepo(_MemoryIconRepo):
    async def upsert(self, *, purpose: str, description: str, svg_content: str) -> IconRecord:
        raise RuntimeError("icon persistence failed")


class _StubEmbeddingClient:
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def embed(self, text: str) -> list[float]:
        self.calls.append(text)
        h = hash(text)
        return [((h >> (i * 4)) & 0xF) / 15.0 for i in range(8)]


class _StubIconGenerator:
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def generate_svg(self, description: str) -> str:
        self.calls.append(description)
        return VALID_SVG


class _StubPersonaGenerator:
    async def generate(self, *, dials) -> Persona:
        return Persona(
            title_en="Hop Hunter",
            blurb_en="You chase big, bitter, adventurous brews.",
            title_he="צייד כשות",
            blurb_he="אתה רודף אחרי טעמים מרים והרפתקניים.",
        )


FAKE_USER = {"sub": "user_test_456"}

_HOP_HEAD_ANSWERS = {
    "coffee": "black",
    "chocolate": "dark_90",
    "water": "strong",
    "sour_foods": "okay",
    "smoked_foods": "love",
    "sweet_tooth": "dry",
    "strength": "strong",
    "adventure": "high",
}


@pytest.fixture
def repo() -> _MemoryRepo:
    return _MemoryRepo()


@pytest.fixture
def icon_repo() -> _MemoryIconRepo:
    return _MemoryIconRepo()


@pytest.fixture
def embedding_client() -> _StubEmbeddingClient:
    return _StubEmbeddingClient()


@pytest.fixture
def icon_generator() -> _StubIconGenerator:
    return _StubIconGenerator()


@pytest.fixture
def persona_generator() -> _StubPersonaGenerator:
    return _StubPersonaGenerator()


@pytest.fixture
def client(
    repo: _MemoryRepo,
    icon_repo: _MemoryIconRepo,
    embedding_client: _StubEmbeddingClient,
    icon_generator: _StubIconGenerator,
    persona_generator: _StubPersonaGenerator,
) -> TestClient:
    app.dependency_overrides[get_baseline_taste_repo] = lambda: repo
    app.dependency_overrides[get_icon_repo] = lambda: icon_repo
    app.dependency_overrides[_embedding_client_dep] = lambda: embedding_client
    app.dependency_overrides[_icon_generator_dep] = lambda: icon_generator
    app.dependency_overrides[_persona_generator_dep] = lambda: persona_generator
    app.dependency_overrides[get_current_user] = lambda: FAKE_USER
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_baseline_taste_repo, None)
        app.dependency_overrides.pop(get_icon_repo, None)
        app.dependency_overrides.pop(_embedding_client_dep, None)
        app.dependency_overrides.pop(_icon_generator_dep, None)
        app.dependency_overrides.pop(_persona_generator_dep, None)
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


def test_bitterness_direct_leads_over_coffee_proxy(client: TestClient) -> None:
    # Black coffee + very dark chocolate alone score bitterness ~0.95; a direct
    # "wince" must pull it down (0.7*0.1 + 0.3*0.95 = 0.355), proving the direct
    # answer leads and the coffee/chocolate proxy only refines.
    r = client.post("/onboarding", json={**_HOP_HEAD_ANSWERS, "bitterness_direct": "wince"})
    assert r.status_code == 201, r.text
    assert r.json()["bitterness"] < 0.5


def test_roasted_dislike_drops_roasty_dial(client: TestClient) -> None:
    # "hate" roasted flavor must drive roasty near zero even though the base
    # answers include black coffee + dark chocolate (which otherwise push it high).
    r = client.post("/onboarding", json={**_HOP_HEAD_ANSWERS, "roasted": "hate"})
    assert r.status_code == 201, r.text
    assert r.json()["flavor_family"]["roasty"] <= 0.1


def test_onboarding_persists_current_model_version(client: TestClient) -> None:
    r = client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    assert r.status_code == 201, r.text
    assert r.json()["model_version"] == TASTE_MODEL_VERSION


def test_onboarding_includes_new_taste_dials(client: TestClient) -> None:
    r = client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    assert r.status_code == 201, r.text
    body = r.json()
    for dial in ("sweetness", "body", "abv_affinity"):
        assert 0.0 <= body[dial] <= 1.0, f"{dial} missing or out of range"


def test_onboarding_persists_bilingual_persona(client: TestClient) -> None:
    client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    r = client.get("/me/baseline-taste")
    assert r.status_code == 200
    persona = r.json()["persona"]
    assert persona["title_en"] == "Hop Hunter"
    assert persona["title_he"] == "צייד כשות"
    assert persona["blurb_en"]
    assert persona["blurb_he"]


def test_get_my_baseline_taste_404_before_onboarding(client: TestClient) -> None:
    r = client.get("/me/baseline-taste")
    assert r.status_code == 404


def test_get_my_baseline_taste_returns_persisted(client: TestClient) -> None:
    client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    r = client.get("/me/baseline-taste")
    assert r.status_code == 200
    body = r.json()
    assert body["user_id"] == FAKE_USER["sub"]


def test_get_my_baseline_taste_includes_curated_icons(
    client: TestClient,
    icon_generator: _StubIconGenerator,
) -> None:
    client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    r = client.get("/me/baseline-taste")
    assert r.status_code == 200
    body = r.json()
    assert body["icons"] is not None
    hero = body["icons"]["hero"]
    assert hero["svg"] == get_curated_svg(hero["purpose"])
    assert len(body["icons"]["flavors"]) == 4
    sour = next(f for f in body["icons"]["flavors"] if f["flavor_key"] == "sour")
    assert "hsl(48 96% 58%)" in sour["svg"]
    assert icon_generator.calls == []


def test_get_my_baseline_taste_succeeds_when_icon_repo_raises(
    client: TestClient,
    icon_generator: _StubIconGenerator,
) -> None:
    app.dependency_overrides[get_icon_repo] = lambda: _FailingIconRepo()
    try:
        client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
        r = client.get("/me/baseline-taste")
        assert r.status_code == 200
        assert r.json()["icons"] is None
    finally:
        app.dependency_overrides[get_icon_repo] = lambda: _MemoryIconRepo()


def test_patch_baseline_taste_endpoint_removed(client: TestClient) -> None:
    client.post("/onboarding", json=_HOP_HEAD_ANSWERS)
    r = client.patch("/me/baseline-taste", json={"bubbles": 0.1})
    assert r.status_code == 405
