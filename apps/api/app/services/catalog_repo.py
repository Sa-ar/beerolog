"""Read the seeded beers catalog from Postgres for the matcher.

Returns the rows shaped as BeerCandidate so match_engine.rank can score
them against the user's baseline + session embeddings.
"""

from __future__ import annotations

from app.services.match_engine import BeerCandidate


def _parse_pgvector(value: object) -> list[float]:
    if isinstance(value, list):
        return [float(v) for v in value]
    if isinstance(value, str):
        return [float(v) for v in value.strip("[]").split(",") if v]
    raise TypeError(f"Unsupported pgvector type: {type(value).__name__}")


async def fetch_catalog(pool) -> list[BeerCandidate]:
    sql = """
        SELECT id, name, brewery, style, abv, market_tier,
               image_url, adventurousness, embedding
        FROM beers
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql)
    return [
        BeerCandidate(
            id=row["id"],
            name=row["name"],
            brewery=row["brewery"],
            style=row["style"],
            abv=row["abv"],
            market_tier=row["market_tier"],
            image_url=row["image_url"],
            adventurousness=row["adventurousness"],
            embedding=_parse_pgvector(row["embedding"]),
        )
        for row in rows
    ]
