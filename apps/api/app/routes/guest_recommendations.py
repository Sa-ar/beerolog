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

import asyncio
import hashlib
import logging
import time

from fastapi import APIRouter, BackgroundTasks, Depends

from app.api_contracts import (
    GuestRecommendationsResponse,
    GuestRecommendedBeer,
    OnboardingAnswers,
)
from app.config import settings
from app.db import get_pool
from app.placeholder_catalog import PLACEHOLDER_CATALOG
from app.services import baseline_taste, guest_submission_repo
from app.services import guest_embedding_cache_repo as embed_cache_repo
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

# ponytail: process-local L1 cache — warms per worker, lost on restart. The key is
# compose_text, which canonicalizes its multi-select fields (sorted + deduped), so
# the key space is the finite onboarding answer space. FIFO-capped anyway to bound
# worker memory (~MAX * 1536 floats) on this public endpoint. The durable L2 is the
# guest_embedding_cache DB table, so a combo embedded once is never re-embedded
# across workers or restarts.
_EMBED_CACHE: dict[str, list[float]] = {}
_EMBED_CACHE_MAX = 4096


def _l1_put(key: str, vec: list[float]) -> None:
    if len(_EMBED_CACHE) >= _EMBED_CACHE_MAX:
        _EMBED_CACHE.pop(next(iter(_EMBED_CACHE)))  # evict oldest (insertion order)
    _EMBED_CACHE[key] = vec


# In-flight paid-embed calls, keyed by cache key: singleflight so concurrent
# cold misses of the same combo share one OpenAI call instead of each spending
# budget. Self-bounded — entries are popped once the call resolves.
_EMBED_INFLIGHT: dict[str, asyncio.Lock] = {}


class _RateBudget:
    """Per-worker fixed-window counter. App-level backstop behind the per-IP
    Vercel WAF rate-limit rule (docs/services/vercel-api.md); not per-IP, so under
    a sustained flood legitimate users hit the cap too until the window resets.
    The cap is PER WORKER, so the process-wide total is limit x worker count — the
    WAF rule is the global, per-IP bound."""

    def __init__(self, limit: int, window_s: float = 60.0) -> None:
        self._limit = limit
        self._window_s = window_s
        self._start = 0.0
        self._count = 0

    def take(self) -> bool:
        """Reserve one slot in the current window; False if exhausted."""
        now = time.monotonic()
        if now - self._start >= self._window_s:
            self._start = now
            self._count = 0
        if self._count >= self._limit:
            return False
        self._count += 1
        return True


# Caps PAID embed calls (cache miss -> OpenAI spend) and anonymous submission
# writes (one DB INSERT each, otherwise unbounded on a public endpoint).
_EMBED_BUDGET = _RateBudget(60)
_RECORD_BUDGET = _RateBudget(600)


def _optional_embedding_client() -> EmbeddingClient | None:
    """Embedding client when configured, else None — never 503s the guest path."""
    return get_embedding_client() if settings.openai_api_key else None


async def _cached_embed(text: str, client: EmbeddingClient) -> list[float] | None:
    """Cached embedding, or None when the paid-embed budget is exhausted.

    Lookup order: L1 in-process dict -> L2 persistent DB table -> paid OpenAI
    call (budget-gated). Hits from either cache are free and always served; only
    a full miss spends budget + an API call, then writes through to both tiers.
    None signals the caller to fall back to dial scoring.
    """
    # Namespace the key by model + dim so a model/vector-size change yields fresh
    # keys at BOTH tiers (L1 and L2) instead of serving stale cached vectors.
    key = hashlib.sha256(f"{settings.embedding_model}|{EMBEDDING_DIM}|{text}".encode()).hexdigest()

    vec = _EMBED_CACHE.get(key)
    if vec is not None:
        return vec

    if settings.database_url:
        try:
            pool = await get_pool()
            vec = await embed_cache_repo.get(pool, key)
            if vec is not None:
                _l1_put(key, vec)
                return vec
        except Exception:
            logger.warning("guest embed cache read failed", exc_info=True)

    # Singleflight the paid embed per key: concurrent cold misses of the same
    # combo wait on one in-flight call rather than each spending budget + OpenAI.
    lock = _EMBED_INFLIGHT.setdefault(key, asyncio.Lock())
    try:
        async with lock:
            vec = _EMBED_CACHE.get(key)  # populated by the winner while we waited?
            if vec is not None:
                return vec
            if not _EMBED_BUDGET.take():
                return None
            vec = await client.embed(text)
            _l1_put(key, vec)
            if settings.database_url:
                try:
                    pool = await get_pool()
                    await embed_cache_repo.put(pool, key, vec)
                except Exception:
                    logger.warning("guest embed cache write failed", exc_info=True)
            return vec
    finally:
        # Safe to drop: by now the cache is populated, so any newcomer hits L1/L2
        # before reaching the lock. A lost race at worst allows one extra embed.
        _EMBED_INFLIGHT.pop(key, None)


async def _record_submission(answers: dict, shown_beer_ids: list[str]) -> None:
    """Persist one pseudonymous free submission, AFTER the response is sent.

    Budget-capped (bounds table growth on this public endpoint) and fully
    error-swallowing, so it can never affect or slow the guest's result.
    """
    if not settings.database_url or not _RECORD_BUDGET.take():
        return
    try:
        pool = await get_pool()
        await guest_submission_repo.record(pool, answers=answers, shown_beer_ids=shown_beer_ids)
    except Exception:
        logger.warning("guest submission record failed", exc_info=True)


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
    background_tasks: BackgroundTasks,
    client: EmbeddingClient | None = Depends(_optional_embedding_client),
) -> GuestRecommendationsResponse:
    # Public + unauthenticated: edge-rate-limited per IP by a Vercel WAF rule
    # (docs/services/vercel-api.md); the _RateBudget caps are app-level backstops.
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

    # Record this pseudonymous free submission AFTER the response is sent (FastAPI
    # background task) so the DB write never adds latency to — or stalls — the
    # guest's result. Budget-capped + error-swallowing inside _record_submission.
    background_tasks.add_task(
        _record_submission,
        answers.model_dump(mode="json"),
        [r.id for r in results],
    )

    return GuestRecommendationsResponse(
        results=results,
        unlocked_count=settings.guest_unlocked_count,
    )
