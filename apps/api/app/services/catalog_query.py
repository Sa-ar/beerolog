"""Shared read/query helpers over the beer catalog.

Powers both the public REST surface (routes/public_catalog.py) and the MCP
tools. Pure composition over the pieces the authed matcher already uses
(fetch_catalog / embed / rank) — no matching logic is re-implemented here.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.services.embedding_service import EmbeddingClient
from app.services.match_engine import BeerCandidate, MatchResult, rank


def search_catalog(
    catalog: Sequence[BeerCandidate],
    *,
    q: str | None = None,
    style: str | None = None,
    brewery: str | None = None,
    min_abv: float | None = None,
    max_abv: float | None = None,
    limit: int = 20,
) -> list[BeerCandidate]:
    """Case-insensitive substring + ABV-band filter. No embeddings involved."""

    def matches(beer: BeerCandidate) -> bool:
        if q:
            hay = f"{beer.name} {beer.name_hebrew or ''} {beer.brewery} {beer.style}".lower()
            if q.lower() not in hay:
                return False
        if style and style.lower() not in beer.style.lower():
            return False
        if brewery and brewery.lower() not in beer.brewery.lower():
            return False
        if min_abv is not None and beer.abv < min_abv:
            return False
        if max_abv is not None and beer.abv > max_abv:
            return False
        return True

    return [b for b in catalog if matches(b)][:limit]


async def recommend_from_text(
    client: EmbeddingClient,
    catalog: Sequence[BeerCandidate],
    preference_text: str,
    *,
    limit: int = 5,
) -> list[MatchResult]:
    """Free-text -> embedding -> ranked beers.

    Anonymous: no session vector and a neutral novelty prior (0.5), so the beta
    novelty re-rank is inert and alpha=1.0 keeps it pure baseline similarity.
    """
    embedding = await client.embed(preference_text)
    return rank(
        baseline_embedding=embedding,
        session_embedding=None,
        novelty_affinity=0.5,
        catalog=catalog,
        alpha=1.0,
        beta=0.0,
        top_k=limit,
    )
