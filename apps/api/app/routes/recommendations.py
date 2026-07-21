"""POST /recommendations — the matcher's public surface.

Accepts baseline dials + optional session intent. When the caller is
authenticated and has a persisted BaselineTaste, uses the stored
embedding instead of re-embedding dial summary text.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.api_contracts import (
    AbvIntent,
    MatchCalibration,
    RecommendationsRequest,
    RecommendationsResponse,
    RecommendedBeer,
    ScoreBreakdown,
)
from app.auth import get_optional_user
from app.config import settings
from app.db import get_pool
from app.placeholder_catalog import get_embedded_catalog
from app.routes.onboarding import get_baseline_taste_repo
from app.services import abv_band, session_intent, why_line
from app.services.baseline_dials_text import dials_to_text
from app.services.baseline_taste_repo import BaselineTasteRepo
from app.services.catalog_repo import fetch_catalog
from app.services.embedding_service import EmbeddingClient, get_embedding_client
from app.services.match_engine import MatchResult, rank
from app.services.why_explainer import WhyBeerInput, WhyExplainer, get_why_explainer

router = APIRouter(prefix="/recommendations", tags=["recommendations"])
_log = logging.getLogger(__name__)


def _embedding_client_dep() -> EmbeddingClient:
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured",
        )
    return get_embedding_client()


def _why_explainer_dep() -> WhyExplainer:
    return get_why_explainer()


def _resolve_alpha(body: RecommendationsRequest) -> float:
    if body.alpha is not None:
        return body.alpha
    if body.session is not None:
        return settings.match_session_alpha
    return settings.match_alpha


async def _resolve_baseline_embedding(
    body: RecommendationsRequest,
    client: EmbeddingClient,
    user: dict | None,
    repo: BaselineTasteRepo,
) -> list[float]:
    if user is not None:
        snap = await repo.get(user["sub"])
        if snap is not None:
            return snap.embedding
    return await client.embed(dials_to_text(body.baseline))


async def _why_texts(
    results: list[MatchResult],
    *,
    session,
    user_flavor: dict[str, float] | None,
    locale: str,
    explainer: WhyExplainer,
) -> dict[str, str | None]:
    inputs: list[WhyBeerInput] = []
    for r in results:
        facts = why_line.build_match_facts(r, session=session, user_flavor=user_flavor)
        inputs.append(
            WhyBeerInput(
                id=r.beer.id,
                name=r.beer.name,
                brewery=r.beer.brewery,
                style=r.beer.style,
                abv=r.beer.abv,
                market_tier=r.beer.market_tier,
                facts=facts,
            )
        )
    return await explainer.explain_batch(inputs, locale=locale)  # type: ignore[arg-type]


@router.post(
    "",
    response_model=RecommendationsResponse,
    operation_id="postRecommendations",
)
async def post_recommendations(
    body: RecommendationsRequest,
    client: EmbeddingClient = Depends(_embedding_client_dep),
    user: dict | None = Depends(get_optional_user),
    repo: BaselineTasteRepo = Depends(get_baseline_taste_repo),
    explainer: WhyExplainer = Depends(_why_explainer_dep),
) -> RecommendationsResponse:
    baseline_vec = await _resolve_baseline_embedding(body, client, user, repo)

    session_vec: list[float] | None = None
    abv_intent = None
    abv_weight = 0.0
    if body.session is not None:
        session_vec = await client.embed(session_intent.compose_text(body.session))
        # An explicit tonight-ABV choice wins; 'any' falls through to the baseline band below.
        if body.session.abv_intent != AbvIntent.any:
            abv_intent = body.session.abv_intent
            abv_weight = settings.match_abv_weight

    alpha = _resolve_alpha(body)
    beta = body.beta if body.beta is not None else settings.match_beta

    catalog: list = []
    if settings.database_url:
        try:
            pool = await get_pool()
            catalog = await fetch_catalog(pool)
        except Exception:
            catalog = []
    if not catalog:
        catalog = await get_embedded_catalog(client)

    novelty_affinity = body.baseline.novelty_affinity
    user_flavor = body.baseline.flavor_family
    if user is not None:
        snap = await repo.get(user["sub"])
        if snap is not None:
            novelty_affinity = snap.novelty_affinity
            user_flavor = snap.flavor_family
            # Persisted ABV appetite as a soft default when tonight has no explicit ABV intent.
            if abv_intent is None:
                abv_intent = abv_band.band_for_affinity(snap.abv_affinity)
                abv_weight = settings.match_abv_weight

    results = rank(
        baseline_embedding=baseline_vec,
        session_embedding=session_vec,
        novelty_affinity=novelty_affinity,
        catalog=catalog,
        alpha=alpha,
        beta=beta,
        top_k=body.top_k,
        abv_intent=abv_intent,
        abv_weight=abv_weight,
        user_flavor=user_flavor,
        avoid_weight=settings.match_avoid_weight,
        avoid_neutral=settings.match_avoid_neutral,
    )

    try:
        llm_why = await _why_texts(
            results,
            session=body.session,
            user_flavor=user_flavor,
            locale=body.locale,
            explainer=explainer,
        )
    except Exception as exc:
        _log.warning("why_explainer batch failed (%s); using template fallback", exc)
        llm_why = {r.beer.id: None for r in results}

    return RecommendationsResponse(
        calibration=MatchCalibration(
            cos_floor=settings.match_cos_floor,
            cos_ceiling=settings.match_cos_ceiling,
        ),
        results=[
            RecommendedBeer(
                id=r.beer.id,
                name=r.beer.name,
                name_hebrew=r.beer.name_hebrew,
                brewery=r.beer.brewery,
                style=r.beer.style,
                abv=r.beer.abv,
                market_tier=r.beer.market_tier,  # type: ignore[arg-type]
                color=r.beer.color,  # type: ignore[arg-type]
                image_url=r.beer.image_url,
                adventurousness=r.beer.adventurousness,
                ibu=r.beer.ibu,
                why=why_line.compose_why(
                    r,
                    session=body.session,
                    user_flavor=user_flavor,
                    text=llm_why.get(r.beer.id),
                ),
                breakdown=ScoreBreakdown(
                    baseline_cos=r.baseline_cos,
                    session_cos=r.session_cos,
                    baseline_score=r.baseline_score,
                    session_score=r.session_score,
                    abv_score=r.abv_score,
                    abv_fits_intent=r.abv_fits_intent,
                    novelty_score=r.novelty_score,
                    total_score=r.total_score,
                    dominant_component=r.dominant_component,
                ),
            )
            for r in results
        ],
        alpha=alpha,
        beta=beta,
    )
