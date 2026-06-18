"""Tests for curated icon registry."""

from beerolog_icon_service.curated_icons import CURATED_SVGS, get_curated_svg
from beerolog_icon_service.validate import validate_svg


def test_curated_registry_covers_catalog_purposes() -> None:
    assert "taste-profile:flavor:sour" in CURATED_SVGS
    assert "session:vibe:refreshing" in CURATED_SVGS
    assert "journey:quiz" in CURATED_SVGS
    assert "marketing:taste-quiz-hero" in CURATED_SVGS


def test_all_curated_svgs_are_valid() -> None:
    for purpose, svg in CURATED_SVGS.items():
        validate_svg(svg)


def test_flavor_icons_use_semantic_accents() -> None:
    sour = CURATED_SVGS["taste-profile:flavor:sour"]
    hoppy = CURATED_SVGS["taste-profile:flavor:hoppy"]
    assert "hsl(48 96% 58%)" in sour
    assert "hsl(92 42% 40%)" in hoppy


def test_vibe_icons_use_semantic_accents() -> None:
    refreshing = CURATED_SVGS["session:vibe:refreshing"]
    adventurous = CURATED_SVGS["session:vibe:adventurous"]
    assert "hsl(195 78% 58%)" in refreshing
    assert "hsl(265 58% 52%)" in adventurous


def test_abv_icons_use_pint_glass() -> None:
    low = CURATED_SVGS["session:abv:low"]
    any_abv = CURATED_SVGS["session:abv:any"]
    assert "hsl(28 70% 45%)" in low
    assert "stroke-dasharray" in any_abv


def test_hero_composite_differs_from_dominant_flavor() -> None:
    composite = get_curated_svg("taste-profile:hero:hoppy+roasty")
    dominant_only = CURATED_SVGS["taste-profile:flavor:hoppy"]
    assert composite is not None
    assert composite != dominant_only
    assert "hero-clip-hoppy-roasty" in composite
    validate_svg(composite)
