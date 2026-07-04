"""Tinder-style rating surface. GET /rate/deck returns beers worth rating.

The batch-apply endpoint (POST /rate/session) lands in a later slice.
See docs/prds/beer-rating-feedback.md.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api_contracts import DeckBeer, RateDeckResponse
from app.auth import get_current_user
from app.config import settings
from app.dependencies import get_deck_catalog
from app.routes.onboarding import get_baseline_taste_repo
from app.routes.ratings import get_ratings_repo
from app.services.baseline_taste_repo import BaselineTasteRepo
from app.services.match_engine import BeerCandidate
from app.services.rate_deck import build_deck
from app.services.ratings_repo import RatingsRepo

router = APIRouter(prefix="/rate", tags=["rate"])


@router.get("/deck", response_model=RateDeckResponse, operation_id="getRateDeck")
async def get_rate_deck(
    user: dict = Depends(get_current_user),
    baseline_repo: BaselineTasteRepo = Depends(get_baseline_taste_repo),
    ratings_repo: RatingsRepo = Depends(get_ratings_repo),
    catalog: list[BeerCandidate] = Depends(get_deck_catalog),
) -> RateDeckResponse:
    snap = await baseline_repo.get(user["sub"])
    baseline_embedding = snap.embedding if snap is not None else None
    rated_ids = await ratings_repo.list_rated_beer_ids(user["sub"])
    deck = build_deck(baseline_embedding, catalog, rated_ids, settings.deck_size)
    return RateDeckResponse(
        beers=[
            DeckBeer(
                id=b.id,
                name=b.name,
                name_hebrew=b.name_hebrew,
                brewery=b.brewery,
                style=b.style,
                abv=b.abv,
                market_tier=b.market_tier,  # type: ignore[arg-type]
                color=b.color,  # type: ignore[arg-type]
                image_url=b.image_url,
            )
            for b in deck
        ]
    )
