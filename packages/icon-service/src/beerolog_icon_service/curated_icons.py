"""Curated SVG icons resolved from the icon factory."""

from __future__ import annotations

from beerolog_icon_service.icon_factory import build_hero_svg, build_icon_registry

CURATED_SVGS: dict[str, str] = build_icon_registry()


def get_curated_svg(purpose: str) -> str | None:
    """Return curated SVG for a purpose, including taste-profile hero aliases."""

    if purpose in CURATED_SVGS:
        return CURATED_SVGS[purpose]

    if purpose.startswith("taste-profile:hero:"):
        keys = purpose.removeprefix("taste-profile:hero:").split("+")
        return build_hero_svg(keys)

    return None
