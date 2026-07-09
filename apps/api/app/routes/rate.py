"""Tinder-style rating surface. GET /rate/deck returns beers worth rating.

The batch-apply endpoint (POST /rate/session) lands in a later slice.
See docs/prds/beer-rating-feedback.md.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, BackgroundTasks, Depends

from app.api_contracts import (
    DeckBeer,
    RateDeckResponse,
    RateSessionRequest,
    RateSessionResponse,
)
from app.auth import get_current_user
from app.config import settings
from app.dependencies import (
    get_deck_catalog,
    get_note_analyzer,
    get_taste_feedback_service,
)
from app.routes.onboarding import get_baseline_taste_repo
from app.routes.ratings import get_ratings_repo
from app.services.baseline_taste_repo import BaselineTasteRepo
from app.services.match_engine import BeerCandidate
from app.services.note_analyzer import NoteAnalyzerProtocol
from app.services.rate_deck import build_deck
from app.services.ratings_repo import RatingsRepo
from app.services.taste_feedback_service import TasteFeedbackService

logger = logging.getLogger("beerolog.api")

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


@router.post("/session", response_model=RateSessionResponse, operation_id="postRateSession")
async def post_rate_session(
    body: RateSessionRequest,
    background_tasks: BackgroundTasks,
    user: dict = Depends(get_current_user),
    ratings_repo: RatingsRepo = Depends(get_ratings_repo),
    feedback: TasteFeedbackService = Depends(get_taste_feedback_service),
    note_analyzer: NoteAnalyzerProtocol = Depends(get_note_analyzer),
) -> RateSessionResponse:
    # Deck path: persist every swipe, then apply ONE combined nudge from the
    # pre-session baseline (avoids whipsawing the vector mid-deck).
    # Server-side guard: the deck is new-beers-only. Skip swipes for beers the
    # user has already rated so a stale/replayed swipe can't overwrite an
    # existing rating (issue #3 — never trust the frontend). Changing a rating
    # happens through search/recommendations, not here.
    rated_ids = await ratings_repo.list_rated_beer_ids(user["sub"])
    skipped = 0
    recorded: list[tuple[str, str]] = []
    for swipe in body.swipes:
        if swipe.beer_id in rated_ids:
            skipped += 1
            continue
        if not await ratings_repo.beer_exists(swipe.beer_id):
            continue
        await ratings_repo.upsert_rating(
            user_id=user["sub"],
            beer_id=swipe.beer_id,
            rating=swipe.rating,
            note=swipe.note,
        )
        recorded.append((swipe.beer_id, swipe.rating))
        if swipe.note:
            background_tasks.add_task(
                note_analyzer.analyze,
                user_id=user["sub"],
                beer_id=swipe.beer_id,
                rating=swipe.rating,
                note=swipe.note,
            )
    if skipped:
        logger.info(
            "rate/session skipped %d already-rated swipe(s) for user=%s", skipped, user["sub"]
        )
    await feedback.apply_batch(user_id=user["sub"], ratings=recorded)
    return RateSessionResponse(recorded=len(recorded))
