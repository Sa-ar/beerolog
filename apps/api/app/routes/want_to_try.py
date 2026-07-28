"""Want-to-try routes (slice #325).

Right-swipe (`want`) / super-like (`must_try`) persistence for `What I want`,
mirroring the ratings routes. Right/super-like also feed the taste signal.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api_contracts import (
    CreateWantToTryRequest,
    WantToTryListResponse,
    WantToTryRecord,
)
from app.auth import get_current_user
from app.dependencies import get_taste_feedback_service
from app.services.taste_feedback_service import TasteFeedbackService
from app.services.want_to_try_repo import WantToTryRepo, WantToTryRow

router = APIRouter(tags=["want-to-try"])


def get_want_to_try_repo() -> WantToTryRepo:
    """Real impl wired in main.py / lifespan; tests override via dependency_overrides."""
    raise NotImplementedError(
        "WantToTryRepo is not wired in this build. Override via dependency_overrides "
        "in tests, or wire AsyncpgWantToTryRepo via the lifespan in production."
    )


def _record(row: WantToTryRow) -> WantToTryRecord:
    return WantToTryRecord(
        beer_id=row.beer_id,
        beer_name=row.beer_name,
        beer_brewery=row.beer_brewery,
        beer_image_url=row.beer_image_url,
        state=row.state,
        created_at=row.created_at,
    )


@router.post(
    "/me/want-to-try",
    response_model=WantToTryRecord,
    status_code=status.HTTP_201_CREATED,
    operation_id="addWantToTry",
)
async def add_want_to_try(
    body: CreateWantToTryRequest,
    user: dict = Depends(get_current_user),
    repo: WantToTryRepo = Depends(get_want_to_try_repo),
    feedback: TasteFeedbackService = Depends(get_taste_feedback_service),
) -> WantToTryRecord:
    if not await repo.beer_exists(body.beer_id):
        raise HTTPException(status_code=404, detail=f"Beer not found: {body.beer_id}")
    row = await repo.upsert(user_id=user["sub"], beer_id=body.beer_id, state=body.state)
    # Right-swipe and super-like are both positive taste signals (#325). The
    # 3-state vocab has no mild-positive value, so both nudge via `loved`.
    await feedback.apply(user_id=user["sub"], beer_id=body.beer_id, rating="loved")
    return _record(row)


@router.get(
    "/me/want-to-try",
    response_model=WantToTryListResponse,
    operation_id="listWantToTry",
)
async def list_want_to_try(
    user: dict = Depends(get_current_user),
    repo: WantToTryRepo = Depends(get_want_to_try_repo),
) -> WantToTryListResponse:
    rows = await repo.list_for_user(user["sub"])
    return WantToTryListResponse(items=[_record(r) for r in rows])


@router.delete(
    "/me/want-to-try/{beer_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="removeWantToTry",
)
async def remove_want_to_try(
    beer_id: str,
    user: dict = Depends(get_current_user),
    repo: WantToTryRepo = Depends(get_want_to_try_repo),
) -> Response:
    await repo.remove(user_id=user["sub"], beer_id=beer_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
