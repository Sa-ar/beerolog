"""POST /recommendations — the matcher's public surface.

For slice #74, the caller posts dials + session intent directly (no
persistence). Slice #76 introduces the persisted BaselineTaste flow.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.api_contracts import (
    RecommendationsRequest,
    RecommendationsResponse,
    RecommendedBeer,
    ScoreBreakdown,
)
from app.config import settings
from app.db import get_pool
from app.placeholder_catalog import get_embedded_catalog
from app.services import session_intent, why_line
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


@router.post(
    "",
    response_model=RecommendationsResponse,
    operation_id="postRecommendations",
)
async def post_recommendations(
    body: RecommendationsRequest,
    client: EmbeddingClient = Depends(_embedding_client_dep),
) -> RecommendationsResponse:
    # Slice #74 uses dials directly to synthesise a baseline text; slice #76
    # will replace this with a persisted BaselineTaste lookup.
    baseline_text = _dials_to_text(body.baseline)
    baseline_vec = await client.embed(baseline_text)

    session_vec: list[float] | None = None
    if body.session is not None:
        session_vec = await client.embed(session_intent.compose_text(body.session))

    alpha = body.alpha if body.alpha is not None else settings.match_alpha
    beta = body.beta if body.beta is not None else settings.match_beta

    catalog: list = []
    if settings.database_url:
        try:
            pool = await get_pool()
            catalog = await fetch_catalog(pool)
        except Exception:
            # DB unreachable (e.g. test harness without a live db) — fall back.
            catalog = []
    if not catalog:
        catalog = await get_embedded_catalog(client)
    results = rank(
        baseline_embedding=baseline_vec,
        session_embedding=session_vec,
        novelty_affinity=body.baseline.novelty_affinity,
        catalog=catalog,
        alpha=alpha,
        beta=beta,
        top_k=body.top_k,
    )

    return RecommendationsResponse(
        results=[
            RecommendedBeer(
                id=r.beer.id,
                name=r.beer.name,
                brewery=r.beer.brewery,
                style=r.beer.style,
                abv=r.beer.abv,
                market_tier=r.beer.market_tier,  # type: ignore[arg-type]
                image_url=r.beer.image_url,
                why_line=why_line.explain(r.dominant_component, session=body.session),
                breakdown=ScoreBreakdown(
                    baseline_score=r.baseline_score,
                    session_score=r.session_score,
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


def _dials_to_text(dials) -> str:
    family_top = sorted(dials.flavor_family.items(), key=lambda kv: kv[1], reverse=True)
    top_flavors = ", ".join(f"{name}" for name, _ in family_top[:3])
    bitterness_word = (
        "high" if dials.bitterness > 0.6 else "moderate" if dials.bitterness > 0.35 else "low"
    )
    bubbles_word = (
        "strongly carbonated"
        if dials.bubbles > 0.65
        else "moderately carbonated"
        if dials.bubbles > 0.35
        else "lightly carbonated"
    )
    novelty_word = (
        "seeks novel and intense flavors"
        if dials.novelty_affinity > 0.5
        else "prefers familiar approachable flavors"
    )
    return (
        f"User taste profile. Prefers {bubbles_word} drinks. "
        f"Tolerates {bitterness_word} bitterness. "
        f"Drawn to {top_flavors} flavors. "
        f"{novelty_word.capitalize()}."
    )
