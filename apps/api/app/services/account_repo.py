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

import json
from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ExportRatingData:
    beer_id: str
    rating: str | None
    note: str | None


@dataclass(frozen=True)
class ExportBaselineData:
    bubbles: float
    bitterness: float
    flavor_family: dict[str, float]
    novelty_affinity: float


@dataclass(frozen=True)
class AccountExportData:
    """Human-readable export of a user's Beerolog-owned data.

    The internal taste embedding vector is intentionally excluded — it is not
    human-readable. Its existence is disclosed in the privacy policy.
    """

    id: str
    email: str | None
    display_name: str | None
    baseline_taste: ExportBaselineData | None
    ratings: list[ExportRatingData]


class AccountRepo(Protocol):
    async def delete_account(self, *, user_id: str) -> None: ...

    async def export_account(self, *, user_id: str) -> AccountExportData: ...


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

    async def export_account(self, *, user_id: str) -> AccountExportData:
        async with self._pool.acquire() as conn:
            user_row = await conn.fetchrow(
                "SELECT id, email, display_name FROM users WHERE id = $1", user_id
            )
            baseline_row = await conn.fetchrow(
                "SELECT bubbles, bitterness, flavor_family, novelty_affinity "
                "FROM user_baseline_taste WHERE user_id = $1",
                user_id,
            )
            rating_rows = await conn.fetch(
                "SELECT beer_id, rating, note FROM beer_ratings "
                "WHERE user_id = $1 ORDER BY created_at",
                user_id,
            )

        baseline = None
        if baseline_row is not None:
            raw_family = baseline_row["flavor_family"]
            family = raw_family if isinstance(raw_family, dict) else json.loads(raw_family)
            baseline = ExportBaselineData(
                bubbles=baseline_row["bubbles"],
                bitterness=baseline_row["bitterness"],
                flavor_family=family,
                novelty_affinity=baseline_row["novelty_affinity"],
            )

        return AccountExportData(
            id=user_row["id"] if user_row else user_id,
            email=user_row["email"] if user_row else None,
            display_name=user_row["display_name"] if user_row else None,
            baseline_taste=baseline,
            ratings=[
                ExportRatingData(beer_id=r["beer_id"], rating=r["rating"], note=r["note"])
                for r in rating_rows
            ],
        )
