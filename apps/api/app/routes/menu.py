"""Menu-scan surface. POST /menu/scan takes a photo of the menu, extracts beer
names via vision, and fuzzy-matches them against the live catalog.
Revived tracer for the venue/menu-scan direction. Signed-in only.
"""

from __future__ import annotations

import asyncio
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, status
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
from app.services.observability import observed_async_openai
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


# A menu line only borrows a catalog beer's name/embedding when the match is
# this strong; below it we keep the exact menu text (never relabel a beer).
CONFIDENT_MATCH = 0.85
# ponytail: cap the menu so a huge/adversarial image can't fan out into
# hundreds of embedding calls. Real menus are well under this.
MAX_MENU_BEERS = 60


def _fit_pct(baseline_cos: float) -> float:
    """Rescale raw cosine to a user-facing 0..1 fit, same anchors as the
    recommendations surface (settings.match_cos_floor/ceiling)."""
    span = settings.match_cos_ceiling - settings.match_cos_floor
    if span <= 0:
        return 0.0
    return max(0.0, min(1.0, (baseline_cos - settings.match_cos_floor) / span))


def _menu_beer_text(name: str) -> str:
    """Embedding text for a board beer we couldn't confidently match to the
    catalog. Anchors the bare name in the beer domain so it lands near real
    catalog beers in the embedding space."""
    return f"{name}. Beer on a menu."


async def _resolve_session(
    session: SessionIntent | None, emb: EmbeddingClient | None
) -> tuple[list[float] | None, float, AbvIntent | None, float]:
    """Embed an optional tonight's-direction into the matcher's session inputs,
    exactly as /recommendations does. No session (or no key) -> baseline only."""
    if session is None or emb is None:
        return None, settings.match_alpha, None, 0.0
    session_vec = await emb.embed(session_intent_svc.compose_text(session))
    abv_intent = session.abv_intent if session.abv_intent != AbvIntent.any else None
    abv_weight = settings.match_abv_weight if abv_intent is not None else 0.0
    return session_vec, settings.match_session_alpha, abv_intent, abv_weight


def _synthetic_candidate(cand_id: str, name: str, embedding: list[float]) -> BeerCandidate:
    """Wrap an off-catalog board beer so the ranker can score it by taste. Neutral
    ABV / adventurousness so only taste similarity drives its position."""
    return BeerCandidate(
        id=cand_id,
        name=name,
        brewery="",
        style="",
        abv=5.0,
        market_tier="",
        color="",
        image_url=None,
        adventurousness=0.5,
        embedding=embedding,
    )


def _vision_client_dep() -> OpenAILLMClient:
    """Per-request OpenAI vision adapter. Overridden in tests."""
    if not settings.openai_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Menu scan requires an OpenAI API key",
        )
    return OpenAILLMClient(observed_async_openai(settings.openai_api_key))


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
    results = (await scan_menu(body.image_base64, entries, llm))[:MAX_MENU_BEERS]

    # Optional tonight's-direction re-weights the pool via the /recommendations path.
    session_vec, alpha, abv_intent, abv_weight = await _resolve_session(body.session, emb)

    # Every beer ON THE MENU gets ranked — nothing dropped, nothing injected. A
    # confident catalog match lends its richer taste embedding + canonical name;
    # anything looser keeps the exact menu text and is embedded from its name, so
    # we never relabel a menu beer as a different catalog beer.
    def _confident(r) -> bool:
        return bool(r.match and r.confidence >= CONFIDENT_MATCH and r.match.id in by_id)

    unknown_texts = [r.raw_text for r in results if not _confident(r)]
    unknown_emb: dict[str, list[float]] = {}
    if unknown_texts and emb is not None:
        vecs = await asyncio.gather(*(emb.embed(_menu_beer_text(t)) for t in unknown_texts))
        unknown_emb = dict(zip(unknown_texts, vecs))

    # One row per board line, plus the candidate list handed to the ranker.
    rows: list[dict] = []
    rankable: list[BeerCandidate] = []
    for idx, r in enumerate(results):
        if _confident(r):
            beer = by_id[r.match.id]
            rankable.append(beer)
            rows.append(
                {
                    "cand_id": beer.id,
                    "raw_text": r.raw_text,
                    "matched_id": beer.id,
                    "confidence": r.confidence,
                    "name": beer.name,
                    "brewery": beer.brewery,
                    "style": beer.style,
                    "abv": beer.abv,
                }
            )
        else:
            cand_id = f"menu:{idx}"
            vec = unknown_emb.get(r.raw_text)
            if vec is not None:
                rankable.append(_synthetic_candidate(cand_id, r.raw_text, vec))
            rows.append(
                {
                    "cand_id": cand_id if vec is not None else None,
                    "raw_text": r.raw_text,
                    "matched_id": None,
                    "confidence": r.confidence,
                    "name": r.raw_text,
                    "brewery": None,
                    "style": None,
                    "abv": None,
                }
            )

    fit: dict[str, float] = {}
    order: dict[str, int] = {}
    baseline = await repo.get(user["sub"])
    if baseline and rankable:
        ranked = rank(
            baseline_embedding=baseline.embedding,
            session_embedding=session_vec,
            novelty_affinity=baseline.novelty_affinity,
            catalog=rankable,
            alpha=alpha,
            beta=settings.match_beta,
            top_k=len(rankable),
            abv_intent=abv_intent,
            abv_weight=abv_weight,
        )
        fit = {m.beer.id: _fit_pct(m.baseline_cos) for m in ranked}
        order = {m.beer.id: i for i, m in enumerate(ranked)}

    # Best taste-fit first; anything we couldn't rank (no baseline / no key) keeps
    # board order at the bottom but is still returned.
    rows.sort(
        key=lambda row: order.get(row["cand_id"], len(order)) if row["cand_id"] else len(order)
    )
    return [
        ScanResultItem(
            raw_text=row["raw_text"],
            matched_id=row["matched_id"],
            confidence=row["confidence"],
            needs_review=row["matched_id"] is None,
            name=row["name"],
            brewery=row["brewery"],
            style=row["style"],
            abv=row["abv"],
            taste_fit=fit.get(row["cand_id"]) if row["cand_id"] else None,
        )
        for row in rows
    ]


class MenuRankRequest(BaseModel):
    beer_ids: list[str]
    session: SessionIntent | None = None


@router.post("/rank", response_model=list[ScanResultItem], operation_id="rankMenuBeers")
async def rank_menu_beers(
    body: MenuRankRequest,
    user: dict = Depends(get_current_user),
    catalog: list[BeerCandidate] = Depends(get_deck_catalog),
    repo: BaselineTasteRepo = Depends(get_baseline_taste_repo),
    emb: EmbeddingClient | None = Depends(_embedding_client_dep),
) -> list[ScanResultItem]:
    """Rank an explicit set of catalog beers against the user's taste — the manual
    'add a beer we missed' path. Same taste_fit scale as /menu/scan so results
    merge cleanly into the same comparison list. Unknown ids are dropped."""
    by_id = {b.id: b for b in catalog}
    picked = [by_id[bid] for bid in dict.fromkeys(body.beer_ids) if bid in by_id]

    session_vec, alpha, abv_intent, abv_weight = await _resolve_session(body.session, emb)
    fit: dict[str, float] = {}
    order: dict[str, int] = {}
    baseline = await repo.get(user["sub"])
    if baseline and picked:
        ranked = rank(
            baseline_embedding=baseline.embedding,
            session_embedding=session_vec,
            novelty_affinity=baseline.novelty_affinity,
            catalog=picked,
            alpha=alpha,
            beta=settings.match_beta,
            top_k=len(picked),
            abv_intent=abv_intent,
            abv_weight=abv_weight,
        )
        fit = {m.beer.id: _fit_pct(m.baseline_cos) for m in ranked}
        order = {m.beer.id: i for i, m in enumerate(ranked)}

    picked.sort(key=lambda b: order.get(b.id, len(order)))
    return [
        ScanResultItem(
            raw_text=b.name,
            matched_id=b.id,
            confidence=1.0,
            needs_review=False,
            name=b.name,
            brewery=b.brewery,
            style=b.style,
            abv=b.abv,
            taste_fit=fit.get(b.id),
        )
        for b in picked
    ]


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
