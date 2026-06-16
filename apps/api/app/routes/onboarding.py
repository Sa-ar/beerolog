"""Onboarding + persisted BaselineTaste routes (slice #76).

- POST /onboarding: accepts the 7-question quiz answers, composes
  dials + synthetic preference text, embeds, persists BaselineTaste.
- GET /me/baseline-taste: returns the persisted dials.
- PATCH /me/baseline-taste: edits any subset of dials, re-embeds, persists.

The API does NOT introduce a new user table — it uses the Clerk
subject as the foreign key on user_baseline_taste, the same way ratings
do (slice #78). Caller is responsible for ensuring the users row exists
(provisioned at Clerk sign-up; out of scope for this slice).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api_contracts import (
    BaselineTasteRecord,
    OnboardingAnswers,
    PatchBaselineTasteRequest,
)
from app.auth import get_current_user
from app.config import settings
from app.services import baseline_taste
from app.services.baseline_taste_repo import BaselineTasteRepo
from app.services.embedding_service import EmbeddingClient, get_embedding_client

router = APIRouter(tags=["onboarding"])


def get_baseline_taste_repo() -> BaselineTasteRepo:
    """Wired in production via lifespan; overridden in tests."""
    raise NotImplementedError(
        "BaselineTasteRepo not wired in this build. Override via dependency_overrides in tests."
    )


def _embedding_client_dep() -> EmbeddingClient:
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured",
        )
    return get_embedding_client()


@router.post(
    "/onboarding",
    response_model=BaselineTasteRecord,
    status_code=status.HTTP_201_CREATED,
    operation_id="completeOnboarding",
)
async def complete_onboarding(
    answers: OnboardingAnswers,
    user: dict = Depends(get_current_user),
    repo: BaselineTasteRepo = Depends(get_baseline_taste_repo),
    client: EmbeddingClient = Depends(_embedding_client_dep),
) -> BaselineTasteRecord:
    dials = baseline_taste.compose_dials(answers)
    text = baseline_taste.compose_text(answers)
    embedding = await client.embed(text)
    saved = await repo.save(
        user_id=user["sub"],
        bubbles=dials.bubbles,
        bitterness=dials.bitterness,
        flavor_family=dials.flavor_family,
        novelty_affinity=dials.novelty_affinity,
        embedding=embedding,
    )
    return _record_from_snapshot(saved)


@router.get(
    "/me/baseline-taste",
    response_model=BaselineTasteRecord,
    operation_id="getMyBaselineTaste",
)
async def get_my_baseline_taste(
    user: dict = Depends(get_current_user),
    repo: BaselineTasteRepo = Depends(get_baseline_taste_repo),
) -> BaselineTasteRecord:
    snap = await repo.get(user["sub"])
    if snap is None:
        raise HTTPException(
            status_code=404,
            detail="BaselineTaste not set. Complete onboarding first.",
        )
    return _record_from_snapshot(snap)


@router.patch(
    "/me/baseline-taste",
    response_model=BaselineTasteRecord,
    operation_id="patchMyBaselineTaste",
)
async def patch_my_baseline_taste(
    body: PatchBaselineTasteRequest,
    user: dict = Depends(get_current_user),
    repo: BaselineTasteRepo = Depends(get_baseline_taste_repo),
    client: EmbeddingClient = Depends(_embedding_client_dep),
) -> BaselineTasteRecord:
    existing = await repo.get(user["sub"])
    if existing is None:
        raise HTTPException(
            status_code=404,
            detail="BaselineTaste not set. Complete onboarding first.",
        )
    bubbles = body.bubbles if body.bubbles is not None else existing.bubbles
    bitterness = body.bitterness if body.bitterness is not None else existing.bitterness
    flavor_family = body.flavor_family if body.flavor_family is not None else existing.flavor_family
    novelty_affinity = (
        body.novelty_affinity if body.novelty_affinity is not None else existing.novelty_affinity
    )

    # Re-embed from the new dial state. We synthesize a coarse text from
    # the dial state (same shape used by the smoke route's _dials_to_text).
    text = _text_from_dials(
        bubbles=bubbles,
        bitterness=bitterness,
        flavor_family=flavor_family,
        novelty_affinity=novelty_affinity,
    )
    embedding = await client.embed(text)
    saved = await repo.save(
        user_id=user["sub"],
        bubbles=bubbles,
        bitterness=bitterness,
        flavor_family=flavor_family,
        novelty_affinity=novelty_affinity,
        embedding=embedding,
    )
    return _record_from_snapshot(saved)


def _record_from_snapshot(snap) -> BaselineTasteRecord:
    return BaselineTasteRecord(
        user_id=snap.user_id,
        bubbles=snap.bubbles,
        bitterness=snap.bitterness,
        flavor_family=snap.flavor_family,
        novelty_affinity=snap.novelty_affinity,
        embedding_fresh_at=snap.embedding_fresh_at,
        updated_at=snap.updated_at,
    )


def _text_from_dials(
    *,
    bubbles: float,
    bitterness: float,
    flavor_family: dict[str, float],
    novelty_affinity: float,
) -> str:
    family_top = sorted(flavor_family.items(), key=lambda kv: kv[1], reverse=True)
    top_flavors = ", ".join(name for name, _ in family_top[:3])
    bitterness_word = "high" if bitterness > 0.6 else "moderate" if bitterness > 0.35 else "low"
    bubbles_word = (
        "strongly carbonated"
        if bubbles > 0.65
        else "moderately carbonated"
        if bubbles > 0.35
        else "lightly carbonated"
    )
    novelty_word = (
        "seeks novel and intense flavors"
        if novelty_affinity > 0.5
        else "prefers familiar approachable flavors"
    )
    return (
        f"User taste profile. Prefers {bubbles_word} drinks. "
        f"Tolerates {bitterness_word} bitterness. "
        f"Drawn to {top_flavors} flavors. "
        f"{novelty_word.capitalize()}."
    )
