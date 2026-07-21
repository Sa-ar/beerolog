"""Read the seeded beers catalog from Postgres for the matcher.

Returns the rows shaped as BeerCandidate so match_engine.rank can score
them against the user's baseline + session embeddings.
"""

from __future__ import annotations

from typing import Protocol

from app.services.match_engine import BeerCandidate


def _parse_pgvector(value: object) -> list[float]:
    if isinstance(value, list):
        return [float(v) for v in value]
    if isinstance(value, str):
        return [float(v) for v in value.strip("[]").split(",") if v]
    raise TypeError(f"Unsupported pgvector type: {type(value).__name__}")


class BeerEmbeddingRepo(Protocol):
    async def get_embedding(self, beer_id: str) -> list[float] | None: ...


class AsyncpgBeerEmbeddingRepo:
    """Loads a single beer's embedding by id, for the rating feedback nudge."""

    def __init__(self, pool) -> None:
        self._pool = pool

    async def get_embedding(self, beer_id: str) -> list[float] | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT embedding FROM beers WHERE id = $1", beer_id)
        return _parse_pgvector(row["embedding"]) if row is not None else None


class AsyncpgBeerDescriptorRepo:
    """Short human-readable beer descriptor for the NoteAnalyzer LLM prompt."""

    def __init__(self, pool) -> None:
        self._pool = pool

    async def get_descriptor(self, beer_id: str) -> str | None:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT name, style, abv FROM beers WHERE id = $1", beer_id)
        if row is None:
            return None
        return f"{row['name']}, style {row['style']}, abv {row['abv']}%"


async def fetch_catalog(pool) -> list[BeerCandidate]:
    sql = """
        SELECT id, name, name_hebrew, brewery, style, abv, market_tier, color,
               image_url, adventurousness, ibu, embedding
        FROM beers
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql)
    return [
        BeerCandidate(
            id=row["id"],
            name=row["name"],
            name_hebrew=row["name_hebrew"],
            brewery=row["brewery"],
            style=row["style"],
            abv=row["abv"],
            market_tier=row["market_tier"],
            color=row["color"],
            image_url=row["image_url"],
            adventurousness=row["adventurousness"],
            ibu=row["ibu"],
            embedding=_parse_pgvector(row["embedding"]),
        )
        for row in rows
    ]
