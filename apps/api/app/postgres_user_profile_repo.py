from __future__ import annotations

from datetime import UTC

import asyncpg  # type: ignore[import-not-found]

from app.models.flavor import FLAVOR_VECTOR_SCHEMA_VERSION


class PostgresUserProfileRepo:
    def __init__(self, pool: asyncpg.Pool) -> None:
        self._pool = pool

    async def get_profile(self, user_id: str) -> list[float] | None:
        row = await self._pool.fetchrow(
            """
            SELECT flavor_vector
            FROM user_profiles
            WHERE user_id = $1
            """,
            user_id,
        )
        if row is None:
            return None
        return list(row["flavor_vector"])

    async def save_profile(self, user_id: str, vector: list[float]) -> None:
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO users (id)
                    VALUES ($1)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    user_id,
                )
                await conn.execute(
                    """
                    INSERT INTO user_profiles (user_id, flavor_vector, schema_version)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (user_id) DO UPDATE
                    SET
                        flavor_vector = EXCLUDED.flavor_vector,
                        schema_version = EXCLUDED.schema_version,
                        updated_at = NOW()
                    """,
                    user_id,
                    vector,
                    FLAVOR_VECTOR_SCHEMA_VERSION,
                )

    async def get_history(self, user_id: str) -> list[dict]:
        rows = await self._pool.fetch(
            """
            SELECT beer_id, rating, created_at
            FROM beer_ratings
            WHERE user_id = $1
            ORDER BY created_at DESC
            """,
            user_id,
        )
        return [
            {
                "beer_id": row["beer_id"],
                "rating": row["rating"],
                "tried_at": row["created_at"].astimezone(UTC).isoformat(),
            }
            for row in rows
        ]

    async def add_to_history(self, user_id: str, beer_id: str, rating: str | None) -> None:
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO users (id)
                    VALUES ($1)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    user_id,
                )
                await conn.execute(
                    """
                    INSERT INTO beer_ratings (user_id, beer_id, rating)
                    VALUES ($1, $2, $3)
                    """,
                    user_id,
                    beer_id,
                    rating,
                )

    async def get_suppressions(self, user_id: str) -> dict[str, int]:
        rows = await self._pool.fetch(
            """
            SELECT style, remaining_count
            FROM user_style_suppressions
            WHERE user_id = $1
            """,
            user_id,
        )
        return {row["style"]: row["remaining_count"] for row in rows}

    async def set_suppressions(self, user_id: str, suppressions: dict[str, int]) -> None:
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                await conn.execute(
                    """
                    INSERT INTO users (id)
                    VALUES ($1)
                    ON CONFLICT (id) DO NOTHING
                    """,
                    user_id,
                )
                await conn.execute(
                    """
                    DELETE FROM user_style_suppressions
                    WHERE user_id = $1
                    """,
                    user_id,
                )

                if suppressions:
                    await conn.executemany(
                        """
                        INSERT INTO user_style_suppressions (user_id, style, remaining_count)
                        VALUES ($1, $2, $3)
                        ON CONFLICT (user_id, style) DO UPDATE
                        SET
                            remaining_count = EXCLUDED.remaining_count,
                            updated_at = NOW()
                        """,
                        [
                            (user_id, style, remaining_count)
                            for style, remaining_count in suppressions.items()
                        ],
                    )
