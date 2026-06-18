"""POST /recommendations — the matcher's public surface.

Accepts baseline dials + optional session intent. When the caller is
authenticated and has a persisted BaselineTaste, uses the stored
embedding instead of re-embedding dial summary text.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api_contracts import (
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
from app.services import session_intent, why_line
from app.services.baseline_dials_text import dials_to_text
from app.services.baseline_taste_repo import BaselineTasteRepo
from app.services.catalog_repo import fetch_catalog
from app.services.embedding_service import EmbeddingClient, get_embedding_client
from app.services.match_engine import rank

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


def _embedding_client_dep() -> EmbeddingClient:
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OPENAI_API_KEY is not configured",
        )
    return get_embedding_client()


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
) -> RecommendationsResponse:
    baseline_vec = await _resolve_baseline_embedding(body, client, user, repo)

    session_vec: list[float] | None = None
    abv_intent = None
    if body.session is not None:
        session_vec = await client.embed(session_intent.compose_text(body.session))
        abv_intent = body.session.abv_intent

    alpha = _resolve_alpha(body)
    beta = body.beta if body.beta is not None else settings.match_beta
    abv_weight = settings.match_abv_weight if body.session is not None else 0.0

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
    if user is not None:
        snap = await repo.get(user["sub"])
        if snap is not None:
            novelty_affinity = snap.novelty_affinity

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
    )

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
                why=why_line.explain(r.dominant_component, session=body.session),
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
