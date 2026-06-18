from __future__ import annotations

import asyncio

import pytest  # type: ignore[import-not-found]

from beerolog_icon_service.curated_icons import CURATED_SVGS, get_curated_svg
from beerolog_icon_service.models import IconRecord
from beerolog_icon_service.service import get_or_create_icon, resolve_taste_profile_icons
from beerolog_icon_service.validate import InvalidSvgError, validate_svg

VALID_SVG = '<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="8"/></svg>'
UNKNOWN_PURPOSE = "custom:unknown:icon"


class _MemoryIconRepo:
    def __init__(self) -> None:
        self._rows: dict[str, IconRecord] = {}
        self.insert_calls = 0
        self.upsert_calls = 0

    async def find_by_purpose(self, purpose: str) -> IconRecord | None:
        return self._rows.get(purpose)

    async def insert_or_get(
        self, *, purpose: str, description: str, svg_content: str
    ) -> IconRecord:
        self.insert_calls += 1
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
        self.upsert_calls += 1
        record = IconRecord(
            id=f"id-{purpose}",
            purpose=purpose,
            description=description,
            svg_content=svg_content,
            created_at="2026-06-17T00:00:00+00:00",
        )
        self._rows[purpose] = record
        return record


class _StubGenerator:
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def generate_svg(self, description: str) -> str:
        self.calls.append(description)
        return VALID_SVG


@pytest.mark.asyncio
async def test_get_or_create_uses_curated_without_generator() -> None:
    repo = _MemoryIconRepo()

    record = await get_or_create_icon(
        purpose="taste-profile:flavor:sour",
        description="sour",
        repo=repo,
        generator=None,
    )

    assert record.svg_content == CURATED_SVGS["taste-profile:flavor:sour"]
    assert repo.upsert_calls == 1


@pytest.mark.asyncio
async def test_get_or_create_overwrites_stale_cache_with_curated() -> None:
    repo = _MemoryIconRepo()
    repo._rows["taste-profile:flavor:malty"] = IconRecord(
        id="stale",
        purpose="taste-profile:flavor:malty",
        description="old gpt",
        svg_content=VALID_SVG,
        created_at="2026-06-17T00:00:00+00:00",
    )

    record = await get_or_create_icon(
        purpose="taste-profile:flavor:malty",
        description="malty",
        repo=repo,
        generator=_StubGenerator(),
    )

    assert record.svg_content == CURATED_SVGS["taste-profile:flavor:malty"]
    assert record.svg_content != VALID_SVG


@pytest.mark.asyncio
async def test_get_or_create_generates_on_miss_for_unknown_purpose() -> None:
    repo = _MemoryIconRepo()
    generator = _StubGenerator()

    record = await get_or_create_icon(
        purpose=UNKNOWN_PURPOSE,
        description="custom icon",
        repo=repo,
        generator=generator,
    )

    assert record.purpose == UNKNOWN_PURPOSE
    assert record.svg_content == VALID_SVG
    assert generator.calls == ["custom icon"]
    assert repo.insert_calls == 1


@pytest.mark.asyncio
async def test_concurrent_curated_resolve_is_stable() -> None:
    repo = _MemoryIconRepo()

    results = await asyncio.gather(
        get_or_create_icon(
            purpose="taste-profile:flavor:sour",
            description="sour",
            repo=repo,
            generator=None,
        ),
        get_or_create_icon(
            purpose="taste-profile:flavor:sour",
            description="sour",
            repo=repo,
            generator=None,
        ),
    )

    assert results[0].svg_content == results[1].svg_content


@pytest.mark.asyncio
async def test_resolve_taste_profile_icons_returns_hero_and_flavors() -> None:
    repo = _MemoryIconRepo()

    bundle = await resolve_taste_profile_icons(
        bubbles=0.5,
        bitterness=0.7,
        flavor_family={
            "malty": 0.3,
            "hoppy": 0.9,
            "roasty": 0.8,
            "fruity": 0.2,
            "sour": 0.4,
            "smoky": 0.6,
        },
        novelty_affinity=0.85,
        repo=repo,
        generator=None,
    )

    assert bundle is not None
    assert bundle.hero.purpose == "taste-profile:hero:hoppy+roasty"
    assert bundle.hero.svg != CURATED_SVGS["taste-profile:flavor:hoppy"]
    assert bundle.hero.svg == get_curated_svg("taste-profile:hero:hoppy+roasty")
    assert len(bundle.flavors) == 4
    assert bundle.flavors[3].svg == CURATED_SVGS["taste-profile:flavor:sour"]


def test_validate_svg_rejects_unsafe_markup() -> None:
    with pytest.raises(InvalidSvgError):
        validate_svg('<svg><script>alert(1)</script></svg>')
    with pytest.raises(InvalidSvgError):
        validate_svg("not svg")


def test_validate_svg_accepts_valid_markup() -> None:
    assert validate_svg(VALID_SVG) == VALID_SVG
