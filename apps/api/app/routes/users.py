"""Account routes: data-subject rights over Beerolog-owned data.

Slice #104 — account deletion (right to erasure). Export (#105) is added to
this router separately.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from app.auth import get_current_user
from app.observability import logger
from app.services.account_repo import AccountRepo

router = APIRouter(tags=["account"])


class AccountDeletionResponse(BaseModel):
    """Contract the web client uses to then complete Clerk sign-out."""

    deleted: bool


class ExportRating(BaseModel):
    beer_id: str
    rating: str | None
    note: str | None


class ExportBaselineTaste(BaseModel):
    bubbles: float
    bitterness: float
    flavor_family: dict[str, float]
    novelty_affinity: float


class AccountExport(BaseModel):
    """Portable copy of a user's Beerolog-owned data (no internal embedding)."""

    id: str
    email: str | None
    display_name: str | None
    baseline_taste: ExportBaselineTaste | None
    ratings: list[ExportRating]


def get_account_repo() -> AccountRepo:
    """Real impl wired in main.py / lifespan; tests override via dependency_overrides."""
    raise NotImplementedError(
        "AccountRepo is not wired in this build. Override via dependency_overrides in tests, "
        "or wire AsyncpgAccountRepo via the lifespan in production."
    )


@router.delete("/me", response_model=AccountDeletionResponse, operation_id="deleteMyAccount")
async def delete_my_account(
    request: Request,
    user: dict = Depends(get_current_user),
    repo: AccountRepo = Depends(get_account_repo),
) -> AccountDeletionResponse:
    await repo.delete_account(user_id=user["sub"])
    # Log the erasure with request id + user id only — never email or payloads.
    logger.info(
        "account deleted user_id=%s request_id=%s",
        user["sub"],
        request.headers.get("X-Request-ID"),
    )
    return AccountDeletionResponse(deleted=True)


@router.get("/me/export", response_model=AccountExport, operation_id="exportMyAccount")
async def export_my_account(
    user: dict = Depends(get_current_user),
    repo: AccountRepo = Depends(get_account_repo),
) -> AccountExport:
    data = await repo.export_account(user_id=user["sub"])
    # Never log the export payload (email, ratings, notes) — only the user id.
    logger.info("account export user_id=%s", user["sub"])
    return AccountExport(
        id=data.id,
        email=data.email,
        display_name=data.display_name,
        baseline_taste=(
            ExportBaselineTaste(
                bubbles=data.baseline_taste.bubbles,
                bitterness=data.baseline_taste.bitterness,
                flavor_family=data.baseline_taste.flavor_family,
                novelty_affinity=data.baseline_taste.novelty_affinity,
            )
            if data.baseline_taste is not None
            else None
        ),
        ratings=[
            ExportRating(beer_id=r.beer_id, rating=r.rating, note=r.note) for r in data.ratings
        ],
    )
