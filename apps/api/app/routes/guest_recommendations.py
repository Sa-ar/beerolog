"""POST /guest-recommendations — the PUBLIC preview surface.

A signed-out visitor posts the onboarding answers and gets a ranked slice
of the catalog. When OPENAI_API_KEY is configured and the catalog carries
embeddings, results use the SAME embedding match engine as the authed path,
with the baseline embedding served from a process-local write-through cache
(the initial questionnaire has a small, finite answer space, so the cache
warms fast and most guests pay no OpenAI call). Without a key, an embeddable
catalog, or on any embedding failure, it falls back to dial-space scoring so
the public surface never 503s.

Pipeline: answers -> compose_dials -> load catalog -> embedding match (cached)
or rank_by_dials fallback -> GuestRecommendedBeer.
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends

from app.api_contracts import (
    GuestRecommendationsResponse,
    GuestRecommendedBeer,
    OnboardingAnswers,
)
from app.config import settings
from app.db import get_pool
from app.placeholder_catalog import PLACEHOLDER_CATALOG
from app.services import baseline_taste
from app.services.catalog_repo import fetch_catalog
from app.services.dial_match import rank_by_dials
from app.services.embedding_service import (
    EMBEDDING_DIM,
    EmbeddingClient,
    get_embedding_client,
)
from app.services.match_engine import BeerCandidate, rank

router = APIRouter(tags=["guest"])
logger = logging.getLogger(__name__)

# ponytail: process-local cache — warms per worker, lost on restart. Bounded with
# FIFO eviction because this endpoint is PUBLIC and unauthenticated: the cache key
# (compose_text) includes order-sensitive multi-select fields, so the key space is
# attacker-controllable, not the "small finite" space the happy path assumes. The
# cap bounds worker memory (~MAX * 1536 floats); rate-limiting (see TODO below)
# still owes the per-request OpenAI cost bound. Upgrade to a shared DB/pgvector
# table only if running serverless or many workers at scale.
_EMBED_CACHE: dict[str, list[float]] = {}
_EMBED_CACHE_MAX = 4096

# Per-worker fixed-window budget on PAID embed calls (cache misses) — a stopgap
# spend cap on this public, unauthenticated endpoint until gateway rate limiting
# lands (see TODO in the handler). Over budget, guests dial-score instead. Not
# per-IP: under a sustained flood legitimate users also degrade to dials until
# the window resets. ponytail: global counter, swap for a real limiter at the
# edge when one exists.
_EMBED_BUDGET = 60
_EMBED_WINDOW_S = 60.0
_embed_window_start = 0.0
_embed_window_count = 0


def _embed_budget_ok() -> bool:
    """Reserve one paid-embed slot in the current window; False if exhausted."""
    global _embed_window_start, _embed_window_count
    now = time.monotonic()
    if now - _embed_window_start >= _EMBED_WINDOW_S:
        _embed_window_start = now
        _embed_window_count = 0
    if _embed_window_count >= _EMBED_BUDGET:
        return False
    _embed_window_count += 1
    return True


def _optional_embedding_client() -> EmbeddingClient | None:
    """Embedding client when configured, else None — never 503s the guest path."""
    return get_embedding_client() if settings.openai_api_key else None


async def _cached_embed(text: str, client: EmbeddingClient) -> list[float] | None:
    """Cached embedding, or None when the paid-embed budget is exhausted.

    Cache hits are free and always served; only a miss spends budget + an API
    call. None signals the caller to fall back to dial scoring.
    """
    vec = _EMBED_CACHE.get(text)
    if vec is not None:
        return vec
    if not _embed_budget_ok():
        return None
    vec = await client.embed(text)
    if len(_EMBED_CACHE) >= _EMBED_CACHE_MAX:
        _EMBED_CACHE.pop(next(iter(_EMBED_CACHE)))  # evict oldest (insertion order)
    _EMBED_CACHE[text] = vec
    return vec


def _calibrate_percent(score: float) -> int:
    """Map a cosine-weighted match score to 0-100 using the match calibration."""
    lo, hi = settings.match_cos_floor, settings.match_cos_ceiling
    pct = (score - lo) / (hi - lo) if hi > lo else 0.0
    return round(max(0.0, min(1.0, pct)) * 100)


async def _load_catalog() -> list[BeerCandidate]:
    """Catalog for dial-space scoring — never embeds, never calls OpenAI.

    Uses the same DB fetch as the authed path when a database is configured;
    falls back to the in-memory placeholder catalog otherwise (the placeholder
    is used directly here, NOT get_embedded_catalog which would require an
    embedding client).
    """
    if settings.database_url:
        try:
            pool = await get_pool()
            catalog = await fetch_catalog(pool)
            if catalog:
                return catalog
        except Exception:
            pass
    return list(PLACEHOLDER_CATALOG)


def _guest_beer(beer: BeerCandidate, match_percent: int) -> GuestRecommendedBeer:
    return GuestRecommendedBeer(
        id=beer.id,
        name=beer.name,
        name_hebrew=beer.name_hebrew,
        brewery=beer.brewery,
        style=beer.style,
        abv=beer.abv,
        color=beer.color,  # type: ignore[arg-type]
        image_url=beer.image_url,
        match_percent=match_percent,
        why=f"Matches your taste profile ({match_percent}% fit).",
    )


@router.post(
    "/guest-recommendations",
    response_model=GuestRecommendationsResponse,
    operation_id="postGuestRecommendations",
)
async def post_guest_recommendations(
    answers: OnboardingAnswers,
    client: EmbeddingClient | None = Depends(_optional_embedding_client),
) -> GuestRecommendationsResponse:
    # TODO: rate-limit (infra) — this endpoint is public and unauthenticated.
    dials = baseline_taste.compose_dials(answers)
    catalog = await _load_catalog()

    results: list[GuestRecommendedBeer] = []
    # Embedding-quality match only when we have a client AND the catalog carries
    # real full-dimension vectors. The in-memory placeholder catalog ships toy
    # low-dim embeddings (dev/DB-less); those must dial-score, not be cosine-
    # compared against a 1536-D questionnaire vector.
    embedded = bool(catalog) and len(catalog[0].embedding) == EMBEDDING_DIM
    if client is not None and embedded:
        try:
            baseline_vec = await _cached_embed(baseline_taste.compose_text(answers), client)
            # baseline_vec is None when the paid-embed budget is spent -> dials.
            ranked = (
                rank(
                    baseline_embedding=baseline_vec,
                    session_embedding=None,
                    novelty_affinity=dials.novelty_affinity,
                    catalog=catalog,
                    alpha=settings.match_alpha,
                    beta=settings.match_beta,
                    top_k=settings.guest_top_k,
                )
                if baseline_vec is not None
                else []
            )
            # No beer clears the similarity floor -> the catalog gave no real
            # embedding signal (e.g. dev seeds use fake vectors). Dial-score
            # instead of returning a list of meaningless 0% matches.
            if ranked and max(r.baseline_cos for r in ranked) >= settings.match_cos_floor:
                results = [_guest_beer(r.beer, _calibrate_percent(r.total_score)) for r in ranked]
        except Exception:
            # Never 503 the public surface, but don't fail silently: a dead key,
            # quota error, or bug here degrades every guest to dials forever.
            logger.warning(
                "guest embedding match failed; falling back to dial scoring",
                exc_info=True,
            )
            results = []

    if not results:
        results = [
            _guest_beer(s.beer, round(s.score * 100))
            for s in rank_by_dials(dials, catalog, limit=settings.guest_top_k)
        ]

    return GuestRecommendationsResponse(
        results=results,
        unlocked_count=settings.guest_unlocked_count,
    )
