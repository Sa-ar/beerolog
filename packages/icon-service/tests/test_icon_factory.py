"""Tests for icon factory hero composites."""

from beerolog_icon_service.curated_icons import CURATED_SVGS
from beerolog_icon_service.icon_factory import build_hero_svg
from beerolog_icon_service.validate import validate_svg


def test_build_hero_svg_single_flavor_matches_catalog() -> None:
    svg = build_hero_svg(["hoppy"])
    assert svg == CURATED_SVGS["taste-profile:flavor:hoppy"]


def test_build_hero_svg_composite_differs_from_primary_alone() -> None:
    single = build_hero_svg(["hoppy"])
    composite = build_hero_svg(["hoppy", "roasty"])
    assert single is not None
    assert composite is not None
    assert composite != single
    assert "hero-clip-hoppy-roasty" in composite
    validate_svg(composite)


def test_build_hero_svg_preserves_rank_order() -> None:
    malty_first = build_hero_svg(["malty", "hoppy"])
    hoppy_first = build_hero_svg(["hoppy", "malty"])
    assert malty_first != hoppy_first
