"""Ratings routes (slice #78).

Store-only — no embedding mutation. See ADR-0003 and the PRD's
"Out of Scope" section.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api_contracts import (
    CreateRatingRequest,
    RatingRecord,
    RatingsHistoryResponse,
)
from app.auth import get_current_user
from app.dependencies import get_taste_feedback_service
from app.services.ratings_repo import RatingsRepo
from app.services.taste_feedback_service import TasteFeedbackService

router = APIRouter(tags=["ratings"])


def get_ratings_repo() -> RatingsRepo:
    """Real impl wired in main.py / lifespan; tests override via dependency_overrides."""
    raise NotImplementedError(
        "RatingsRepo is not wired in this build. Override via dependency_overrides in tests, "
        "or wire AsyncpgRatingsRepo via the lifespan in production."
    )


@router.post(
    "/ratings",
    response_model=RatingRecord,
    status_code=status.HTTP_201_CREATED,
    operation_id="createRating",
)
async def create_rating(
    body: CreateRatingRequest,
    user: dict = Depends(get_current_user),
    repo: RatingsRepo = Depends(get_ratings_repo),
    feedback: TasteFeedbackService = Depends(get_taste_feedback_service),
) -> RatingRecord:
    if not await repo.beer_exists(body.beer_id):
        raise HTTPException(status_code=404, detail=f"Beer not found: {body.beer_id}")
    row = await repo.upsert_rating(
        user_id=user["sub"],
        beer_id=body.beer_id,
        rating=body.rating,
        note=body.note,
    )
    # Immediate path (card rating): nudge the baseline now. `fine` is a no-op.
    await feedback.apply(user_id=user["sub"], beer_id=body.beer_id, rating=body.rating)
    return RatingRecord(
        id=row.id,
        beer_id=row.beer_id,
        beer_name=row.beer_name,
        beer_brewery=row.beer_brewery,
        rating=row.rating,
        note=row.note,
        created_at=row.created_at,
    )


@router.get(
    "/me/ratings",
    response_model=RatingsHistoryResponse,
    operation_id="listMyRatings",
)
async def list_my_ratings(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
    repo: RatingsRepo = Depends(get_ratings_repo),
) -> RatingsHistoryResponse:
    rows = await repo.list_for_user(user_id=user["sub"], page=page, page_size=page_size)
    return RatingsHistoryResponse(
        ratings=[
            RatingRecord(
                id=r.id,
                beer_id=r.beer_id,
                beer_name=r.beer_name,
                beer_brewery=r.beer_brewery,
                rating=r.rating,
                note=r.note,
                created_at=r.created_at,
            )
            for r in rows
        ],
        page=page,
        page_size=page_size,
    )
