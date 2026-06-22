"""POST /guest-recommendations — the PUBLIC, OpenAI-free preview surface.

A signed-out visitor posts the onboarding answers and gets a ranked slice
of the catalog scored purely in dial space (no embeddings, no OpenAI call).
This route deliberately takes NEITHER an auth dependency NOR the embedding
client dependency that 503s the authed /recommendations path without
OPENAI_API_KEY.

Pipeline: answers -> compose_dials -> load catalog (DB if configured, else
the in-memory placeholder) -> rank_by_dials -> GuestRecommendedBeer.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api_contracts import (
    GuestRecommendationsResponse,
    GuestRecommendedBeer,
    OnboardingAnswers,
)
from app.config import settings
from app.db import get_pool
from app.placeholder_catalog import PLACEHOLDER_CATALOG
from app.services import baseline_taste
from app.services.catalog_repo import fetch_catalog
from app.services.dial_match import ScoredBeer, rank_by_dials
from app.services.match_engine import BeerCandidate

router = APIRouter(tags=["guest"])


async def _load_catalog() -> list[BeerCandidate]:
    """Catalog for dial-space scoring — never embeds, never calls OpenAI.

    Uses the same DB fetch as the authed path when a database is configured;
    falls back to the in-memory placeholder catalog otherwise (the placeholder
    is used directly here, NOT get_embedded_catalog which would require an
    embedding client).
    """
    if settings.database_url:
        try:
            pool = await get_pool()
            catalog = await fetch_catalog(pool)
            if catalog:
                return catalog
        except Exception:
            pass
    return list(PLACEHOLDER_CATALOG)


def _why(scored: ScoredBeer) -> str:
    return f"Matches your taste profile ({round(scored.score * 100)}% fit)."


@router.post(
    "/guest-recommendations",
    response_model=GuestRecommendationsResponse,
    operation_id="postGuestRecommendations",
)
async def post_guest_recommendations(
    answers: OnboardingAnswers,
) -> GuestRecommendationsResponse:
    # TODO: rate-limit (infra) — this endpoint is public and unauthenticated.
    dials = baseline_taste.compose_dials(answers)
    catalog = await _load_catalog()
    ranked = rank_by_dials(dials, catalog, limit=settings.guest_top_k)

    results = [
        GuestRecommendedBeer(
            id=s.beer.id,
            name=s.beer.name,
            name_hebrew=s.beer.name_hebrew,
            brewery=s.beer.brewery,
            style=s.beer.style,
            abv=s.beer.abv,
            color=s.beer.color,  # type: ignore[arg-type]
            image_url=s.beer.image_url,
            match_percent=round(s.score * 100),
            why=_why(s),
        )
        for s in ranked
    ]
    return GuestRecommendationsResponse(
        results=results,
        unlocked_count=settings.guest_unlocked_count,
    )
