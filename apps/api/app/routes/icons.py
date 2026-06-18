"""Public icon catalog routes."""

from __future__ import annotations

import logging

from beerolog_icon_service.generator import GPTIconGenerator
from beerolog_icon_service.protocols import IconGenerator, IconRepo
from beerolog_icon_service.service import resolve_icon_catalog
from fastapi import APIRouter, Depends

from app.api_contracts import CatalogIconItem, IconCatalogResponse
from app.config import settings
from app.routes.onboarding import get_icon_repo

logger = logging.getLogger(__name__)

router = APIRouter(tags=["icons"])


def _icon_generator_dep() -> IconGenerator | None:
    if not settings.openai_api_key:
        return None
    return GPTIconGenerator(api_key=settings.openai_api_key, model=settings.icon_model)


@router.get(
    "/icons/catalog",
    response_model=IconCatalogResponse,
    operation_id="getIconCatalog",
)
async def get_icon_catalog(
    icon_repo: IconRepo = Depends(get_icon_repo),
    icon_generator: IconGenerator | None = Depends(_icon_generator_dep),
) -> IconCatalogResponse:
    try:
        bundle = await resolve_icon_catalog(repo=icon_repo, generator=icon_generator)
    except Exception:
        logger.exception("Failed to resolve icon catalog")
        return IconCatalogResponse()

    if bundle is None:
        return IconCatalogResponse()

    def _items(results) -> list[CatalogIconItem]:
        return [
            CatalogIconItem(key=item.key, purpose=item.purpose, svg=item.svg) for item in results
        ]

    return IconCatalogResponse(
        session_vibes=_items(bundle.session_vibes),
        session_abv=_items(bundle.session_abv),
        journey=_items(bundle.journey),
        flavors=_items(bundle.flavors),
        marketing=_items(bundle.marketing),
    )
