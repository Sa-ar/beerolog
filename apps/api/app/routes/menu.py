"""Menu-scan surface. POST /menu/scan takes a tap-board photo, extracts beer
names via vision, and fuzzy-matches them against the live catalog.
Revived tracer for the venue/menu-scan direction. Signed-in only.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from openai import AsyncOpenAI
from pydantic import BaseModel, Field

from app.auth import get_current_user
from app.config import settings
from app.dependencies import get_deck_catalog
from app.routes.onboarding import get_baseline_taste_repo
from app.services.baseline_taste_repo import BaselineTasteRepo
from app.services.fuzzy_matcher import CatalogEntry
from app.services.match_engine import BeerCandidate, rank
from app.services.menu_scanner import scan_menu
from app.services.vision_service import OpenAILLMClient

router = APIRouter(prefix="/menu", tags=["menu"])


class MenuScanRequest(BaseModel):
    image_base64: str = Field(min_length=1)


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


@router.post("/scan", response_model=list[ScanResultItem], operation_id="scanMenu")
async def scan_menu_image(
    body: MenuScanRequest,
    user: dict = Depends(get_current_user),
    catalog: list[BeerCandidate] = Depends(get_deck_catalog),
    llm: OpenAILLMClient = Depends(_vision_client_dep),
    repo: BaselineTasteRepo = Depends(get_baseline_taste_repo),
) -> list[ScanResultItem]:
    by_id = {b.id: b for b in catalog}
    entries = [CatalogEntry(id=b.id, name=b.name, brewery=b.brewery) for b in catalog]
    results = await scan_menu(body.image_base64, entries, llm)

    # Rank the scanned pool against the user's taste profile. The matched beers
    # ARE the candidate list for match_engine.rank(). Unranked when the user has
    # no baseline yet (graceful degrade to matched-only).
    matched = [by_id[r.match.id] for r in results if r.match and r.match.id in by_id]
    fit: dict[str, float] = {}
    baseline = await repo.get(user["sub"])
    if baseline and matched:
        ranked = rank(
            baseline_embedding=baseline.embedding,
            session_embedding=None,
            novelty_affinity=baseline.novelty_affinity,
            catalog=matched,
            alpha=settings.match_alpha,
            beta=settings.match_beta,
            top_k=len(matched),
        )
        fit = {m.beer.id: _fit_pct(m.baseline_cos) for m in ranked}

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
    # Best taste-fit first; unmatched / unranked sink to the bottom.
    items.sort(key=lambda i: i.taste_fit if i.taste_fit is not None else -1.0, reverse=True)
    return items
