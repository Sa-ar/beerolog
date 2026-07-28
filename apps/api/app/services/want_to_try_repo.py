"""Want-to-try repository (slice #325).

Protocol + asyncpg impl, mirroring ratings_repo. Tests substitute an in-memory
impl via FastAPI dependency_overrides; the asyncpg impl is exercised only
against a live DB. Right-swipe (`want`) / super-like (`must_try`) persistence;
must_try is pinned to the top of the list.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

WantToTryState = Literal["want", "must_try"]


@dataclass(frozen=True)
class WantToTryRow:
    beer_id: str
    beer_name: str
    beer_brewery: str
    beer_image_url: str | None
    state: WantToTryState
    created_at: str


class WantToTryRepo(Protocol):
    async def beer_exists(self, beer_id: str) -> bool: ...

    async def upsert(
        self, *, user_id: str, beer_id: str, state: WantToTryState
    ) -> WantToTryRow: ...

    async def list_for_user(self, user_id: str) -> list[WantToTryRow]: ...

    async def remove(self, *, user_id: str, beer_id: str) -> bool: ...


class AsyncpgWantToTryRepo:
    """Default DB-backed implementation. Exercised only by integration tests."""

    def __init__(self, pool) -> None:
        self._pool = pool

    async def beer_exists(self, beer_id: str) -> bool:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT 1 FROM beers WHERE id = $1", beer_id)
            return row is not None

    async def upsert(self, *, user_id: str, beer_id: str, state: WantToTryState) -> WantToTryRow:
        sql = """
            INSERT INTO want_to_try (user_id, beer_id, state)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, beer_id)
            DO UPDATE SET state = EXCLUDED.state, created_at = NOW()
            RETURNING created_at
        """
        async with self._pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO users (id) VALUES ($1) ON CONFLICT (id) DO NOTHING",
                user_id,
            )
            row = await conn.fetchrow(sql, user_id, beer_id, state)
            beer = await conn.fetchrow(
                "SELECT name, brewery, image_url FROM beers WHERE id = $1", beer_id
            )
            assert beer is not None  # caller validates first via beer_exists
            return WantToTryRow(
                beer_id=beer_id,
                beer_name=beer["name"],
                beer_brewery=beer["brewery"],
                beer_image_url=beer["image_url"],
                state=state,
                created_at=row["created_at"].isoformat(),
            )

    async def list_for_user(self, user_id: str) -> list[WantToTryRow]:
        sql = """
            SELECT w.beer_id, w.state, w.created_at,
                   b.name AS beer_name, b.brewery AS beer_brewery, b.image_url AS beer_image_url
            FROM want_to_try w
            JOIN beers b ON b.id = w.beer_id
            WHERE w.user_id = $1
            ORDER BY (w.state = 'must_try') DESC, w.created_at DESC
        """
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(sql, user_id)
            return [
                WantToTryRow(
                    beer_id=r["beer_id"],
                    beer_name=r["beer_name"],
                    beer_brewery=r["beer_brewery"],
                    beer_image_url=r["beer_image_url"],
                    state=r["state"],
                    created_at=r["created_at"].isoformat(),
                )
                for r in rows
            ]

    async def remove(self, *, user_id: str, beer_id: str) -> bool:
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(
                "DELETE FROM want_to_try WHERE user_id = $1 AND beer_id = $2 RETURNING beer_id",
                user_id,
                beer_id,
            )
        return row is not None
