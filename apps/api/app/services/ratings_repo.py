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


class RatingsRepo(Protocol):
    async def upsert_rating(
        self,
        *,
        user_id: str,
        beer_id: str,
        rating: RatingValue,
        note: str | None,
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
    ) -> RatingRow:
        sql = """
            INSERT INTO beer_ratings (user_id, beer_id, rating, note)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, beer_id)
            DO UPDATE SET rating = EXCLUDED.rating, note = EXCLUDED.note,
                          created_at = NOW()
            RETURNING id, created_at
        """
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
                user_id,
            )
            row = await conn.fetchrow(sql, user_id, beer_id, rating, note)
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
