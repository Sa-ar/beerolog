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
    sweetness: float
    body: float
    abv_affinity: float
    flavor_family: dict[str, float]
    novelty_affinity: float
    embedding: list[float]
    embedding_fresh_at: str
    updated_at: str
    model_version: int = 0
    persona_title_en: str | None = None
    persona_blurb_en: str | None = None
    persona_title_he: str | None = None
    persona_blurb_he: str | None = None


class BaselineTasteRepo(Protocol):
    async def get(self, user_id: str) -> BaselineTasteSnapshot | None: ...

    async def save(
        self,
        *,
        user_id: str,
        bubbles: float,
        bitterness: float,
        sweetness: float,
        body: float,
        abv_affinity: float,
        flavor_family: dict[str, float],
        novelty_affinity: float,
        embedding: list[float],
        model_version: int,
        persona_title_en: str | None = None,
        persona_blurb_en: str | None = None,
        persona_title_he: str | None = None,
        persona_blurb_he: str | None = None,
    ) -> BaselineTasteSnapshot: ...


def _parse_pgvector(value: object) -> list[float]:
    """asyncpg returns pgvector as a string like '[v1,v2,...]'."""
    if isinstance(value, list):
        return [float(v) for v in value]
    if isinstance(value, str):
        return [float(v) for v in value.strip("[]").split(",") if v]
    raise TypeError(f"Unsupported pgvector type: {type(value).__name__}")


class AsyncpgBaselineTasteRepo:
    """DB-backed implementation. Exercised by integration tests against a live DB."""

    def __init__(self, pool) -> None:
        self._pool = pool

    async def get(self, user_id: str) -> BaselineTasteSnapshot | None:
        sql = """
            SELECT user_id, bubbles, bitterness, sweetness, body, abv_affinity,
                   flavor_family, novelty_affinity,
                   embedding, embedding_fresh_at, updated_at, model_version,
                   persona_title_en, persona_blurb_en, persona_title_he, persona_blurb_he
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
                sweetness=row["sweetness"],
                body=row["body"],
                abv_affinity=row["abv_affinity"],
                flavor_family=row["flavor_family"]
                if isinstance(row["flavor_family"], dict)
                else json.loads(row["flavor_family"]),
                novelty_affinity=row["novelty_affinity"],
                embedding=_parse_pgvector(row["embedding"]),
                embedding_fresh_at=row["embedding_fresh_at"].isoformat(),
                updated_at=row["updated_at"].isoformat(),
                model_version=row["model_version"],
                persona_title_en=row["persona_title_en"],
                persona_blurb_en=row["persona_blurb_en"],
                persona_title_he=row["persona_title_he"],
                persona_blurb_he=row["persona_blurb_he"],
            )

    async def save(
        self,
        *,
        user_id: str,
        bubbles: float,
        bitterness: float,
        sweetness: float,
        body: float,
        abv_affinity: float,
        flavor_family: dict[str, float],
        novelty_affinity: float,
        embedding: list[float],
        model_version: int,
        persona_title_en: str | None = None,
        persona_blurb_en: str | None = None,
        persona_title_he: str | None = None,
        persona_blurb_he: str | None = None,
    ) -> BaselineTasteSnapshot:
        import json

        # asyncpg can't natively bind a Python list to pgvector — encode as the
        # textual form '[v1,v2,...]' and cast in SQL.
        embedding_text = "[" + ",".join(repr(float(v)) for v in embedding) + "]"
        sql = """
            INSERT INTO user_baseline_taste
              (user_id, bubbles, bitterness, sweetness, body, abv_affinity,
               flavor_family, novelty_affinity, embedding, model_version,
               persona_title_en, persona_blurb_en, persona_title_he, persona_blurb_he)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9::vector, $10,
                    $11, $12, $13, $14)
            ON CONFLICT (user_id) DO UPDATE SET
              bubbles = EXCLUDED.bubbles,
              bitterness = EXCLUDED.bitterness,
              sweetness = EXCLUDED.sweetness,
              body = EXCLUDED.body,
              abv_affinity = EXCLUDED.abv_affinity,
              flavor_family = EXCLUDED.flavor_family,
              novelty_affinity = EXCLUDED.novelty_affinity,
              embedding = EXCLUDED.embedding,
              model_version = EXCLUDED.model_version,
              persona_title_en = EXCLUDED.persona_title_en,
              persona_blurb_en = EXCLUDED.persona_blurb_en,
              persona_title_he = EXCLUDED.persona_title_he,
              persona_blurb_he = EXCLUDED.persona_blurb_he,
              embedding_fresh_at = NOW(),
              updated_at = NOW()
            RETURNING embedding_fresh_at, updated_at
        """
        async with self._pool.acquire() as conn:
            # Clerk subject is the FK; provision the users row JIT so the
            # first authenticated write doesn't fail on the missing parent.
            await conn.execute(
                "INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
                user_id,
            )
            row = await conn.fetchrow(
                sql,
                user_id,
                bubbles,
                bitterness,
                sweetness,
                body,
                abv_affinity,
                json.dumps(flavor_family),
                novelty_affinity,
                embedding_text,
                model_version,
                persona_title_en,
                persona_blurb_en,
                persona_title_he,
                persona_blurb_he,
            )
            return BaselineTasteSnapshot(
                user_id=user_id,
                bubbles=bubbles,
                bitterness=bitterness,
                sweetness=sweetness,
                body=body,
                abv_affinity=abv_affinity,
                flavor_family=flavor_family,
                novelty_affinity=novelty_affinity,
                embedding=embedding,
                embedding_fresh_at=row["embedding_fresh_at"].isoformat(),
                updated_at=row["updated_at"].isoformat(),
                model_version=model_version,
                persona_title_en=persona_title_en,
                persona_blurb_en=persona_blurb_en,
                persona_title_he=persona_title_he,
                persona_blurb_he=persona_blurb_he,
            )
