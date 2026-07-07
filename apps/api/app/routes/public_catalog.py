"""Public, unauthenticated catalog access for agents & clients.

Read-only surface over the same beers the authed matcher uses: no auth, no user
state, embeddings stripped from responses. The MCP tools shim these routes.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api_contracts import (
    CatalogBeer,
    CatalogListResponse,
    CatalogRecommendation,
    CatalogRecommendRequest,
    CatalogRecommendResponse,
)
from app.config import settings
from app.dependencies import get_deck_catalog
from app.services import why_line
from app.services.catalog_query import recommend_from_text, search_catalog
from app.services.embedding_service import EmbeddingClient, get_embedding_client
from app.services.match_engine import BeerCandidate

router = APIRouter(prefix="/catalog", tags=["catalog"])


def _embedding_client_dep() -> EmbeddingClient:
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI is not configured")
    return get_embedding_client()


def _to_beer(b: BeerCandidate) -> CatalogBeer:
    return CatalogBeer(
        id=b.id,
        name=b.name,
        name_hebrew=b.name_hebrew,
        brewery=b.brewery,
        style=b.style,
        abv=b.abv,
        market_tier=b.market_tier,
        color=b.color,
        image_url=b.image_url,
        adventurousness=b.adventurousness,
    )


@router.get("", response_model=CatalogListResponse, operation_id="listCatalog")
async def list_catalog(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    catalog: list[BeerCandidate] = Depends(get_deck_catalog),
) -> CatalogListResponse:
    start = (page - 1) * page_size
    window = catalog[start : start + page_size]
    return CatalogListResponse(
        beers=[_to_beer(b) for b in window],
        page=page,
        page_size=page_size,
        total=len(catalog),
    )


# /search and /recommend are declared before /{beer_id} so they aren't captured
# as an id path parameter.
@router.get("/search", response_model=list[CatalogBeer], operation_id="searchCatalog")
async def search_catalog_route(
    q: str | None = Query(default=None),
    style: str | None = Query(default=None),
    brewery: str | None = Query(default=None),
    min_abv: float | None = Query(default=None, ge=0),
    max_abv: float | None = Query(default=None, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    catalog: list[BeerCandidate] = Depends(get_deck_catalog),
) -> list[CatalogBeer]:
    hits = search_catalog(
        catalog,
        q=q,
        style=style,
        brewery=brewery,
        min_abv=min_abv,
        max_abv=max_abv,
        limit=limit,
    )
    return [_to_beer(b) for b in hits]


@router.post("/recommend", response_model=CatalogRecommendResponse, operation_id="recommendCatalog")
async def recommend_catalog(
    body: CatalogRecommendRequest,
    catalog: list[BeerCandidate] = Depends(get_deck_catalog),
    client: EmbeddingClient = Depends(_embedding_client_dep),
) -> CatalogRecommendResponse:
    results = await recommend_from_text(client, catalog, body.preference_text, limit=body.limit)
    return CatalogRecommendResponse(
        results=[
            CatalogRecommendation(
                beer=_to_beer(r.beer),
                why=why_line.explain(r.dominant_component, session=None),
            )
            for r in results
        ]
    )


@router.get("/{beer_id}", response_model=CatalogBeer, operation_id="getCatalogBeer")
async def get_catalog_beer(
    beer_id: str,
    catalog: list[BeerCandidate] = Depends(get_deck_catalog),
) -> CatalogBeer:
    for b in catalog:
        if b.id == beer_id:
            return _to_beer(b)
    raise HTTPException(status_code=404, detail=f"Beer not found: {beer_id}")
