from __future__ import annotations

import asyncio

from beerolog_icon_service.curated_icons import get_curated_svg
from beerolog_icon_service.models import (
    CatalogIconResult,
    IconCatalogBundle,
    IconRecord,
    IconRequest,
    TasteProfileIconResult,
    TasteProfileIconsBundle,
)
from beerolog_icon_service.protocols import IconGenerator, IconRepo
from beerolog_icon_service.system_icons import resolve_system_icon_requests
from beerolog_icon_service.taste_profile import resolve_taste_profile_icon_requests


async def get_or_create_icon(
    *,
    purpose: str,
    description: str,
    repo: IconRepo,
    generator: IconGenerator | None,
) -> IconRecord:
    curated = get_curated_svg(purpose)
    if curated is not None:
        return await repo.upsert(purpose=purpose, description=description, svg_content=curated)

    cached = await repo.find_by_purpose(purpose)
    if cached is not None:
        return cached

    if generator is None:
        raise RuntimeError(f"No curated icon or generator available for purpose={purpose}")

    svg = await generator.generate_svg(description)
    return await repo.insert_or_get(purpose=purpose, description=description, svg_content=svg)


async def _resolve_request(
    request: IconRequest,
    *,
    repo: IconRepo,
    generator: IconGenerator | None,
) -> TasteProfileIconResult:
    record = await get_or_create_icon(
        purpose=request.purpose,
        description=request.description,
        repo=repo,
        generator=generator,
    )
    return TasteProfileIconResult(
        purpose=record.purpose,
        svg=record.svg_content,
        flavor_key=request.flavor_key,
    )


async def resolve_taste_profile_icons(
    *,
    bubbles: float,
    bitterness: float,
    flavor_family: dict[str, float],
    novelty_affinity: float,
    repo: IconRepo,
    generator: IconGenerator | None,
) -> TasteProfileIconsBundle | None:
    requests = resolve_taste_profile_icon_requests(
        bubbles=bubbles,
        bitterness=bitterness,
        flavor_family=flavor_family,
        novelty_affinity=novelty_affinity,
    )
    if not requests:
        return None

    hero_request = next((r for r in requests if r.slot == "hero"), None)
    flavor_requests = [r for r in requests if r.slot == "flavor"]
    if hero_request is None:
        return None

    hero, *flavor_results = await asyncio.gather(
        _resolve_request(hero_request, repo=repo, generator=generator),
        *[
            _resolve_request(request, repo=repo, generator=generator)
            for request in flavor_requests
        ],
    )

    return TasteProfileIconsBundle(hero=hero, flavors=list(flavor_results))


def _group_catalog_results(
    requests: list[IconRequest],
    results: list[TasteProfileIconResult],
) -> IconCatalogBundle:
    grouped: dict[str, list[CatalogIconResult]] = {
        "session.vibe": [],
        "session.abv": [],
        "journey": [],
        "flavor": [],
        "marketing": [],
    }
    for request, result in zip(requests, results, strict=True):
        group = request.catalog_group
        key = request.catalog_key
        if group is None or key is None:
            continue
        grouped.setdefault(group, []).append(
            CatalogIconResult(key=key, purpose=result.purpose, svg=result.svg, group=group)
        )

    for items in grouped.values():
        items.sort(key=lambda item: item.key)

    return IconCatalogBundle(
        session_vibes=grouped["session.vibe"],
        session_abv=grouped["session.abv"],
        journey=grouped["journey"],
        flavors=grouped["flavor"],
        marketing=grouped["marketing"],
    )


async def resolve_icon_catalog(
    *,
    repo: IconRepo,
    generator: IconGenerator | None,
) -> IconCatalogBundle | None:
    requests = resolve_system_icon_requests()
    if not requests:
        return None

    results = await asyncio.gather(
        *[_resolve_request(request, repo=repo, generator=generator) for request in requests]
    )
    return _group_catalog_results(requests, list(results))
