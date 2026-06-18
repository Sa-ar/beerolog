from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class IconRecord:
    id: str
    purpose: str
    description: str
    svg_content: str
    created_at: str


@dataclass(frozen=True)
class IconRequest:
    purpose: str
    description: str
    flavor_key: str | None = None
    slot: str = "flavor"
    catalog_group: str | None = None
    catalog_key: str | None = None


@dataclass(frozen=True)
class TasteProfileIconResult:
    purpose: str
    svg: str
    flavor_key: str | None = None


@dataclass(frozen=True)
class TasteProfileIconsBundle:
    hero: TasteProfileIconResult
    flavors: list[TasteProfileIconResult]


@dataclass(frozen=True)
class CatalogIconResult:
    key: str
    purpose: str
    svg: str
    group: str


@dataclass(frozen=True)
class IconCatalogBundle:
    session_vibes: list[CatalogIconResult]
    session_abv: list[CatalogIconResult]
    journey: list[CatalogIconResult]
    flavors: list[CatalogIconResult]
    marketing: list[CatalogIconResult]
