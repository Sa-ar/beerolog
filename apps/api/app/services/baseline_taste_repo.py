"""BaselineTaste repository abstraction (slice #76).

Protocol + asyncpg impl. Tests substitute an in-memory impl via
FastAPI dependency_overrides.

The stored embedding is opaque to this layer — the route hands in a
vector(1536) produced by the embedding service.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class BaselineTasteSnapshot:
    user_id: str
    bubbles: float
    bitterness: float
    flavor_family: dict[str, float]
    novelty_affinity: float
    embedding: list[float]
    embedding_fresh_at: str
    updated_at: str


class BaselineTasteRepo(Protocol):
    async def get(self, user_id: str) -> BaselineTasteSnapshot | None: ...

    async def save(
        self,
        *,
        user_id: str,
        bubbles: float,
        bitterness: float,
        flavor_family: dict[str, float],
        novelty_affinity: float,
        embedding: list[float],
    ) -> BaselineTasteSnapshot: ...


class AsyncpgBaselineTasteRepo:
    """DB-backed implementation. Exercised by integration tests against a live DB."""

    def __init__(self, pool) -> None:
        self._pool = pool

    async def get(self, user_id: str) -> BaselineTasteSnapshot | None:
        sql = """
            SELECT user_id, bubbles, bitterness, flavor_family, novelty_affinity,
                   embedding, embedding_fresh_at, updated_at
            FROM user_baseline_taste
            WHERE user_id = $1
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(sql, user_id)
            if row is None:
                return None
            import json

            return BaselineTasteSnapshot(
                user_id=row["user_id"],
                bubbles=row["bubbles"],
                bitterness=row["bitterness"],
                flavor_family=row["flavor_family"]
                if isinstance(row["flavor_family"], dict)
                else json.loads(row["flavor_family"]),
                novelty_affinity=row["novelty_affinity"],
                embedding=list(row["embedding"]),
                embedding_fresh_at=row["embedding_fresh_at"].isoformat(),
                updated_at=row["updated_at"].isoformat(),
            )

    async def save(
        self,
        *,
        user_id: str,
        bubbles: float,
        bitterness: float,
        flavor_family: dict[str, float],
        novelty_affinity: float,
        embedding: list[float],
    ) -> BaselineTasteSnapshot:
        import json

        sql = """
            INSERT INTO user_baseline_taste
              (user_id, bubbles, bitterness, flavor_family, novelty_affinity, embedding)
            VALUES ($1, $2, $3, $4::jsonb, $5, $6)
            ON CONFLICT (user_id) DO UPDATE SET
              bubbles = EXCLUDED.bubbles,
              bitterness = EXCLUDED.bitterness,
              flavor_family = EXCLUDED.flavor_family,
              novelty_affinity = EXCLUDED.novelty_affinity,
              embedding = EXCLUDED.embedding,
              embedding_fresh_at = NOW(),
              updated_at = NOW()
            RETURNING embedding_fresh_at, updated_at
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                sql,
                user_id,
                bubbles,
                bitterness,
                json.dumps(flavor_family),
                novelty_affinity,
                embedding,
            )
            return BaselineTasteSnapshot(
                user_id=user_id,
                bubbles=bubbles,
                bitterness=bitterness,
                flavor_family=flavor_family,
                novelty_affinity=novelty_affinity,
                embedding=embedding,
                embedding_fresh_at=row["embedding_fresh_at"].isoformat(),
                updated_at=row["updated_at"].isoformat(),
            )
