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
