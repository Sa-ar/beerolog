"""Post-serve outcome signal (slice #350, B4). A consumer marks whether a beer
was what they expected; attributed to the venue. Grounds the return-rate KPI
(C1). DB access injected for testability.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.db import get_pool

router = APIRouter(prefix="/ratings", tags=["ratings"])

# (user_id, beer_id, outcome, venue_id) -> was an existing rating updated
OutcomeSetter = Callable[[str, str, str, str | None], Awaitable[bool]]


def get_outcome_setter() -> OutcomeSetter:
    async def _set(user_id: str, beer_id: str, outcome: str, venue_id: str | None) -> bool:
        pool = await get_pool()
        async with pool.acquire() as conn:
            result = await conn.execute(
                """
                UPDATE beer_ratings SET outcome = $3, outcome_venue_id = $4
                WHERE user_id = $1 AND beer_id = $2
                """,
                user_id,
                beer_id,
                outcome,
                venue_id,
            )
            return result.endswith("1")  # 'UPDATE 1' when a row matched

    return _set


class OutcomeRequest(BaseModel):
    beer_id: str = Field(min_length=1)
    outcome: str = Field(pattern="^(as_expected|not_what_expected|better_than_expected)$")
    venue_id: str | None = None


@router.post("/outcome", status_code=status.HTTP_204_NO_CONTENT, operation_id="setRatingOutcome")
async def set_rating_outcome(
    body: OutcomeRequest,
    user: dict = Depends(get_current_user),
    setter: OutcomeSetter = Depends(get_outcome_setter),
) -> None:
    updated = await setter(user["sub"], body.beer_id, body.outcome, body.venue_id)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="no rating to attach an outcome to"
        )
