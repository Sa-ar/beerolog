"""Menu-scan surface. POST /menu/scan takes a tap-board photo, extracts beer
names via vision, and fuzzy-matches them against the live catalog.
Revived tracer for the venue/menu-scan direction. Signed-in only.
"""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from app.api_contracts import AbvIntent, SessionIntent
from app.auth import get_current_user
from app.config import settings
from app.dependencies import get_deck_catalog
from app.routes.onboarding import get_baseline_taste_repo
from app.services import session_intent as session_intent_svc
from app.services.baseline_taste_repo import BaselineTasteRepo
from app.services.embedding_service import EmbeddingClient, get_embedding_client
from app.services.fuzzy_matcher import CatalogEntry
from app.services.match_engine import BeerCandidate, rank
from app.services.menu_chat import (
    ChatReply,
    ChatTurn,
    GPTMenuChat,
    MenuChatLLM,
    PoolBeer,
    chat_over_pool,
)
from app.services.menu_scanner import scan_menu
from app.services.vision_service import OpenAILLMClient

router = APIRouter(prefix="/menu", tags=["menu"])


class MenuScanRequest(BaseModel):
    image_base64: str = Field(min_length=1)
    # Optional "what I'm feeling tonight" — re-weights the ranking via the same
    # session path as /recommendations. Omitted → baseline-taste order.
    session: SessionIntent | None = None


class ScanResultItem(BaseModel):
    raw_text: str
    matched_id: str | None = None
    confidence: float = Field(ge=0, le=1)
    needs_review: bool = False
    # Canonical catalog fields, filled in when raw_text matched a beer.
    name: str | None = None
    brewery: str | None = None
    style: str | None = None
    abv: float | None = None
    # Calibrated 0..1 fit against the signed-in user's baseline taste. None when
    # the user hasn't onboarded yet (scan still works, just unranked).
    taste_fit: float | None = None


def _fit_pct(baseline_cos: float) -> float:
    """Rescale raw cosine to a user-facing 0..1 fit, same anchors as the
    recommendations surface (settings.match_cos_floor/ceiling)."""
    span = settings.match_cos_ceiling - settings.match_cos_floor
    if span <= 0:
        return 0.0
    return max(0.0, min(1.0, (baseline_cos - settings.match_cos_floor) / span))


def _vision_client_dep() -> OpenAILLMClient:
    """Per-request OpenAI vision adapter. Overridden in tests."""
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Menu scan requires an OpenAI API key",
        )
    return OpenAILLMClient(AsyncOpenAI(api_key=settings.openai_api_key))


def _menu_chat_dep() -> MenuChatLLM:
    """Per-request menu-chat LLM adapter. Overridden in tests."""
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Menu chat requires an OpenAI API key",
        )
    return GPTMenuChat(api_key=settings.openai_api_key, model=settings.note_model)


def _embedding_client_dep() -> EmbeddingClient | None:
    """Embedding client for session-intent re-ranking. None (not 503) without a
    key so a plain scan still works; only a scan *with* a session needs it.
    Overridden in tests."""
    if not settings.openai_api_key:
        return None
    return get_embedding_client()


@router.post("/scan", response_model=list[ScanResultItem], operation_id="scanMenu")
async def scan_menu_image(
    body: MenuScanRequest,
    user: dict = Depends(get_current_user),
    catalog: list[BeerCandidate] = Depends(get_deck_catalog),
    llm: OpenAILLMClient = Depends(_vision_client_dep),
    repo: BaselineTasteRepo = Depends(get_baseline_taste_repo),
    emb: EmbeddingClient | None = Depends(_embedding_client_dep),
) -> list[ScanResultItem]:
    by_id = {b.id: b for b in catalog}
    entries = [CatalogEntry(id=b.id, name=b.name, brewery=b.brewery) for b in catalog]
    results = await scan_menu(body.image_base64, entries, llm)

    # Optional tonight's-direction: embed it as the session vector and let the
    # same matcher path as /recommendations re-weight the pool.
    session_vec: list[float] | None = None
    alpha = settings.match_alpha
    abv_intent: AbvIntent | None = None
    abv_weight = 0.0
    if body.session is not None and emb is not None:
        session_vec = await emb.embed(session_intent_svc.compose_text(body.session))
        alpha = settings.match_session_alpha
        if body.session.abv_intent != AbvIntent.any:
            abv_intent = body.session.abv_intent
            abv_weight = settings.match_abv_weight

    # Rank the scanned pool against the user's taste profile. The matched beers
    # ARE the candidate list for match_engine.rank(). Unranked when the user has
    # no baseline yet (graceful degrade to matched-only).
    matched = [by_id[r.match.id] for r in results if r.match and r.match.id in by_id]
    fit: dict[str, float] = {}
    order: dict[str, int] = {}
    baseline = await repo.get(user["sub"])
    if baseline and matched:
        ranked = rank(
            baseline_embedding=baseline.embedding,
            session_embedding=session_vec,
            novelty_affinity=baseline.novelty_affinity,
            catalog=matched,
            alpha=alpha,
            beta=settings.match_beta,
            top_k=len(matched),
            abv_intent=abv_intent,
            abv_weight=abv_weight,
        )
        fit = {m.beer.id: _fit_pct(m.baseline_cos) for m in ranked}
        order = {m.beer.id: idx for idx, m in enumerate(ranked)}

    items = [
        ScanResultItem(
            raw_text=r.raw_text,
            matched_id=r.match.id if r.match else None,
            confidence=r.confidence,
            needs_review=r.needs_review,
            name=r.match.name if r.match else None,
            brewery=r.match.brewery if r.match else None,
            style=by_id[r.match.id].style if r.match and r.match.id in by_id else None,
            abv=by_id[r.match.id].abv if r.match and r.match.id in by_id else None,
            taste_fit=fit.get(r.match.id) if r.match else None,
        )
        for r in results
    ]
    # Follow rank() order (baseline, or session-aware total when a direction is
    # given); unranked / unmatched sink to the bottom, keeping scan order.
    items.sort(key=lambda i: order.get(i.matched_id, len(order)) if i.matched_id else len(order))
    return items


class ChatPoolBeer(BaseModel):
    id: str
    name: str
    brewery: str | None = None
    style: str | None = None
    abv: float | None = None
    taste_fit: float | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1)


class MenuChatRequest(BaseModel):
    pool: list[ChatPoolBeer]
    messages: list[ChatMessage] = Field(min_length=1)


class MenuChatResponse(BaseModel):
    reply: str
    beer_ids: list[str]


@router.post("/chat", response_model=MenuChatResponse, operation_id="menuChat")
async def menu_chat(
    body: MenuChatRequest,
    _user: dict = Depends(get_current_user),
    llm: MenuChatLLM = Depends(_menu_chat_dep),
) -> MenuChatResponse:
    pool = [
        PoolBeer(
            id=b.id,
            name=b.name,
            brewery=b.brewery,
            style=b.style,
            abv=b.abv,
            taste_fit=b.taste_fit,
        )
        for b in body.pool
    ]
    turns = [ChatTurn(role=m.role, content=m.content) for m in body.messages]
    reply: ChatReply = await chat_over_pool(pool, turns, llm)
    return MenuChatResponse(reply=reply.reply, beer_ids=reply.beer_ids)
