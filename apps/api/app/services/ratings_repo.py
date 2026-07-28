"""Ratings repository abstraction.

Protocol + asyncpg impl. Tests substitute the in-memory impl via
FastAPI dependency_overrides. The Protocol is the contract under test;
the asyncpg impl is exercised only when integration tests run against a
live Neon DB.

No embedding mutation lives here, per the PRD: rating capture is
store-only in v1; the rating-driven embedding update is a separate
post-validation PRD per ADR-0003.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from app.ratings_vocab import RatingValue


@dataclass(frozen=True)
class RatingRow:
    id: str
    user_id: str
    beer_id: str
    beer_name: str
    beer_brewery: str
    rating: RatingValue
    note: str | None
    created_at: str
    proof_photo_url: str | None = None
    proof_source: str | None = None


@dataclass(frozen=True)
class CatchRow:
    beer_id: str
    name: str
    name_hebrew: str | None
    brewery: str
    style: str
    color: str | None
    image_url: str | None
    proof_photo_url: str
    rating: RatingValue
    created_at: str


class RatingsRepo(Protocol):
    async def upsert_rating(
        self,
        *,
        user_id: str,
        beer_id: str,
        rating: RatingValue,
        note: str | None,
        proof_photo_url: str | None = None,
        proof_source: str | None = None,
    ) -> RatingRow: ...

    async def beer_exists(self, beer_id: str) -> bool: ...

    async def list_for_user(
        self,
        *,
        user_id: str,
        page: int,
        page_size: int,
    ) -> list[RatingRow]: ...

    async def count_for_user(self, user_id: str) -> int: ...

    async def list_rated_beer_ids(self, user_id: str) -> set[str]: ...

    async def list_ratings_map(self, user_id: str) -> dict[str, RatingValue]: ...

    async def list_catches(self, user_id: str) -> list[CatchRow]: ...


class AsyncpgRatingsRepo:
    """Default DB-backed implementation. Exercised only by integration tests."""

    def __init__(self, pool) -> None:
        self._pool = pool

    async def upsert_rating(
        self,
        *,
        user_id: str,
        beer_id: str,
        rating: RatingValue,
        note: str | None,
        proof_photo_url: str | None = None,
        proof_source: str | None = None,
    ) -> RatingRow:
        sql = """
            INSERT INTO beer_ratings (user_id, beer_id, rating, note,
                                      proof_photo_url, proof_source)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (user_id, beer_id)
            DO UPDATE SET rating = EXCLUDED.rating, note = EXCLUDED.note,
                          -- Preserve an existing Catch: a proof-less re-rate
                          -- (recommendation card / deck / search) must not wipe
                          -- the proof photo. Only overwrite when new proof is given.
                          proof_photo_url = COALESCE(EXCLUDED.proof_photo_url, beer_ratings.proof_photo_url),
                          proof_source = COALESCE(EXCLUDED.proof_source, beer_ratings.proof_source),
                          created_at = NOW()
            RETURNING id, created_at, proof_photo_url, proof_source
        """
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
                user_id,
            )
            row = await conn.fetchrow(
                sql, user_id, beer_id, rating, note, proof_photo_url, proof_source
            )
            beer = await conn.fetchrow("SELECT name, brewery FROM beers WHERE id = $1", beer_id)
            assert beer is not None  # caller validates first via beer_exists
            return RatingRow(
                id=str(row["id"]),
                user_id=user_id,
                beer_id=beer_id,
                beer_name=beer["name"],
                beer_brewery=beer["brewery"],
                rating=rating,
                note=note,
                created_at=row["created_at"].isoformat(),
                proof_photo_url=row["proof_photo_url"],
                proof_source=row["proof_source"],
            )

    async def beer_exists(self, beer_id: str) -> bool:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT 1 FROM beers WHERE id = $1", beer_id)
            return row is not None

    async def list_for_user(
        self,
        *,
        user_id: str,
        page: int,
        page_size: int,
    ) -> list[RatingRow]:
        offset = (page - 1) * page_size
        sql = """
            SELECT r.id, r.beer_id, r.rating, r.note, r.created_at,
                   b.name AS beer_name, b.brewery AS beer_brewery
            FROM beer_ratings r
            JOIN beers b ON b.id = r.beer_id
            WHERE r.user_id = $1
            ORDER BY r.created_at DESC
            LIMIT $2 OFFSET $3
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, user_id, page_size, offset)
            return [
                RatingRow(
                    id=str(r["id"]),
                    user_id=user_id,
                    beer_id=r["beer_id"],
                    beer_name=r["beer_name"],
                    beer_brewery=r["beer_brewery"],
                    rating=r["rating"],
                    note=r["note"],
                    created_at=r["created_at"].isoformat(),
                )
                for r in rows
            ]

    async def count_for_user(self, user_id: str) -> int:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT count(*) AS n FROM beer_ratings WHERE user_id = $1", user_id
            )
        return int(row["n"]) if row is not None else 0

    async def list_rated_beer_ids(self, user_id: str) -> set[str]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch("SELECT beer_id FROM beer_ratings WHERE user_id = $1", user_id)
        return {r["beer_id"] for r in rows}

    async def list_ratings_map(self, user_id: str) -> dict[str, RatingValue]:
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT beer_id, rating FROM beer_ratings WHERE user_id = $1", user_id
            )
        return {r["beer_id"]: r["rating"] for r in rows}

    async def list_catches(self, user_id: str) -> list[CatchRow]:
        # A Catch is a rating with a proof photo (ADR 0011). Newest first;
        # dedup is inherent (one rating per user+beer).
        sql = """
            SELECT r.beer_id, r.rating, r.created_at, r.proof_photo_url,
                   b.name, b.name_hebrew, b.brewery, b.style, b.color, b.image_url
            FROM beer_ratings r
            JOIN beers b ON b.id = r.beer_id
            WHERE r.user_id = $1 AND r.proof_photo_url IS NOT NULL
            ORDER BY r.created_at DESC
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, user_id)
        return [
            CatchRow(
                beer_id=r["beer_id"],
                name=r["name"],
                name_hebrew=r["name_hebrew"],
                brewery=r["brewery"],
                style=r["style"],
                color=r["color"],
                image_url=r["image_url"],
                proof_photo_url=r["proof_photo_url"],
                rating=r["rating"],
                created_at=r["created_at"].isoformat(),
            )
            for r in rows
        ]
