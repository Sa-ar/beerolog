"""Persistent cache of guest-questionnaire embeddings (pgvector).

Module-level async helpers over the shared asyncpg pool. The onboarding
questionnaire has a finite answer space, so once a combo's embedding is stored
here every worker and every restart reads it instead of calling OpenAI — the
cache eventually serves the whole space and embedding stops.

Keyed by a hash of the canonical synthetic preference text
(baseline_taste.compose_text), so order-equivalent answers share one row.
"""

from __future__ import annotations


def _parse_pgvector(value: object) -> list[float]:
    """asyncpg returns pgvector as a string like '[v1,v2,...]'."""
    if isinstance(value, list):
        return [float(v) for v in value]
    if isinstance(value, str):
        return [float(v) for v in value.strip("[]").split(",") if v]
    raise TypeError(f"Unsupported pgvector type: {type(value).__name__}")


async def get(pool, prompt_hash: str) -> list[float] | None:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT embedding FROM guest_embedding_cache WHERE prompt_hash = $1",
            prompt_hash,
        )
    return _parse_pgvector(row["embedding"]) if row is not None else None


async def put(pool, prompt_hash: str, embedding: list[float]) -> None:
    # asyncpg can't bind a Python list to pgvector — encode as text and cast.
    embedding_text = "[" + ",".join(repr(float(v)) for v in embedding) + "]"
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO guest_embedding_cache (prompt_hash, embedding)
            VALUES ($1, $2::vector)
            ON CONFLICT (prompt_hash) DO NOTHING
            """,
            prompt_hash,
            embedding_text,
        )
