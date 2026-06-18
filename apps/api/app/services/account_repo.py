"""Account repository: erases all Beerolog-owned data for a user.

Protocol + asyncpg impl, matching the repo pattern used elsewhere. Tests
substitute an in-memory impl via FastAPI dependency_overrides; the asyncpg
impl is exercised only by integration tests against a live DB.

Beerolog-owned tables for a user are `user_baseline_taste` and `beer_ratings`
(both `ON DELETE CASCADE` from `users`). We delete them explicitly inside one
transaction, children first, so erasure holds regardless of FK configuration.
Authentication/session data lives with Clerk and is handled by the client
signing the user out after this call.
"""

from __future__ import annotations

from typing import Protocol


class AccountRepo(Protocol):
    async def delete_account(self, *, user_id: str) -> None: ...


class AsyncpgAccountRepo:
    """Default DB-backed implementation. Exercised only by integration tests."""

    def __init__(self, pool) -> None:
        self._pool = pool

    async def delete_account(self, *, user_id: str) -> None:
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute("DELETE FROM beer_ratings WHERE user_id = $1", user_id)
                await conn.execute("DELETE FROM user_baseline_taste WHERE user_id = $1", user_id)
                await conn.execute("DELETE FROM users WHERE id = $1", user_id)
