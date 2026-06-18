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

import logging

from beerolog_icon_service.generator import GPTIconGenerator
from beerolog_icon_service.protocols import IconGenerator, IconRepo
from beerolog_icon_service.service import resolve_taste_profile_icons
from fastapi import APIRouter, Depends, HTTPException, status

from app.api_contracts import (
    BaselineTasteDials,
    BaselineTasteRecord,
    OnboardingAnswers,
    PatchBaselineTasteRequest,
    TasteProfileIcon,
    TasteProfileIcons,
)
from app.auth import get_current_user
from app.config import settings
from app.services import baseline_taste
from app.services.baseline_dials_text import dials_to_text
from app.services.baseline_taste_repo import BaselineTasteRepo, BaselineTasteSnapshot
from app.services.embedding_service import EmbeddingClient, get_embedding_client

logger = logging.getLogger(__name__)

router = APIRouter(tags=["onboarding"])


def get_baseline_taste_repo() -> BaselineTasteRepo:
    """Wired in production via lifespan; overridden in tests."""
    raise NotImplementedError(
        "BaselineTasteRepo not wired in this build. Override via dependency_overrides in tests."
    )


def get_icon_repo() -> IconRepo:
    """Wired in production via lifespan; overridden in tests."""
    raise NotImplementedError(
        "IconRepo not wired in this build. Override via dependency_overrides in tests."
    )


def _embedding_client_dep() -> EmbeddingClient:
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured",
        )
    return get_embedding_client()


def _icon_generator_dep() -> IconGenerator | None:
    if not settings.openai_api_key:
        return None
    return GPTIconGenerator(api_key=settings.openai_api_key, model=settings.icon_model)


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
    icon_repo: IconRepo = Depends(get_icon_repo),
    icon_generator: IconGenerator | None = Depends(_icon_generator_dep),
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
    return await _record_from_snapshot(saved, icon_repo=icon_repo, icon_generator=icon_generator)


@router.get(
    "/me/baseline-taste",
    response_model=BaselineTasteRecord,
    operation_id="getMyBaselineTaste",
)
async def get_my_baseline_taste(
    user: dict = Depends(get_current_user),
    repo: BaselineTasteRepo = Depends(get_baseline_taste_repo),
    icon_repo: IconRepo = Depends(get_icon_repo),
    icon_generator: IconGenerator | None = Depends(_icon_generator_dep),
) -> BaselineTasteRecord:
    snap = await repo.get(user["sub"])
    if snap is None:
        raise HTTPException(
            status_code=404,
            detail="BaselineTaste not set. Complete onboarding first.",
        )
    return await _record_from_snapshot(snap, icon_repo=icon_repo, icon_generator=icon_generator)


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
    icon_repo: IconRepo = Depends(get_icon_repo),
    icon_generator: IconGenerator | None = Depends(_icon_generator_dep),
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
    return await _record_from_snapshot(saved, icon_repo=icon_repo, icon_generator=icon_generator)


async def _record_from_snapshot(
    snap: BaselineTasteSnapshot,
    *,
    icon_repo: IconRepo,
    icon_generator: IconGenerator | None,
) -> BaselineTasteRecord:
    icons = await _resolve_icons(
        snap=snap,
        icon_repo=icon_repo,
        icon_generator=icon_generator,
    )
    return BaselineTasteRecord(
        user_id=snap.user_id,
        bubbles=snap.bubbles,
        bitterness=snap.bitterness,
        flavor_family=snap.flavor_family,
        novelty_affinity=snap.novelty_affinity,
        embedding_fresh_at=snap.embedding_fresh_at,
        updated_at=snap.updated_at,
        icons=icons,
    )


async def _resolve_icons(
    *,
    snap: BaselineTasteSnapshot,
    icon_repo: IconRepo,
    icon_generator: IconGenerator | None,
) -> TasteProfileIcons | None:
    try:
        bundle = await resolve_taste_profile_icons(
            bubbles=snap.bubbles,
            bitterness=snap.bitterness,
            flavor_family=snap.flavor_family,
            novelty_affinity=snap.novelty_affinity,
            repo=icon_repo,
            generator=icon_generator,
        )
    except Exception:
        logger.exception("Failed to resolve taste profile icons for user=%s", snap.user_id)
        return None
    if bundle is None:
        return None
    return TasteProfileIcons(
        hero=TasteProfileIcon(
            purpose=bundle.hero.purpose,
            flavor_key=bundle.hero.flavor_key,
            svg=bundle.hero.svg,
        ),
        flavors=[
            TasteProfileIcon(
                purpose=icon.purpose,
                flavor_key=icon.flavor_key,
                svg=icon.svg,
            )
            for icon in bundle.flavors
        ],
    )


def _text_from_dials(
    *,
    bubbles: float,
    bitterness: float,
    flavor_family: dict[str, float],
    novelty_affinity: float,
) -> str:
    return dials_to_text(
        BaselineTasteDials(
            bubbles=bubbles,
            bitterness=bitterness,
            flavor_family=flavor_family,
            novelty_affinity=novelty_affinity,
        )
    )
