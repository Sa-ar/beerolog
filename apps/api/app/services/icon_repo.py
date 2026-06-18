"""Asyncpg-backed IconRepo adapter for beerolog-icon-service."""

from __future__ import annotations

from beerolog_icon_service.models import IconRecord


class AsyncpgIconRepo:
    def __init__(self, pool) -> None:
        self._pool = pool

    async def find_by_purpose(self, purpose: str) -> IconRecord | None:
        sql = """
            SELECT id, purpose, description, svg_content, created_at
            FROM icons
            WHERE purpose = $1
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(sql, purpose)
            if row is None:
                return None
            return IconRecord(
                id=str(row["id"]),
                purpose=row["purpose"],
                description=row["description"],
                svg_content=row["svg_content"],
                created_at=row["created_at"].isoformat(),
            )

    async def insert_or_get(
        self, *, purpose: str, description: str, svg_content: str
    ) -> IconRecord:
        insert_sql = """
            INSERT INTO icons (purpose, description, svg_content)
            VALUES ($1, $2, $3)
            ON CONFLICT (purpose) DO NOTHING
        """
        select_sql = """
            SELECT id, purpose, description, svg_content, created_at
            FROM icons
            WHERE purpose = $1
        """
        async with self._pool.acquire() as conn:
            await conn.execute(insert_sql, purpose, description, svg_content)
            row = await conn.fetchrow(select_sql, purpose)
            if row is None:
                raise RuntimeError(f"Icon row missing after insert for purpose={purpose}")
            return IconRecord(
                id=str(row["id"]),
                purpose=row["purpose"],
                description=row["description"],
                svg_content=row["svg_content"],
                created_at=row["created_at"].isoformat(),
            )

    async def upsert(self, *, purpose: str, description: str, svg_content: str) -> IconRecord:
        sql = """
            INSERT INTO icons (purpose, description, svg_content)
            VALUES ($1, $2, $3)
            ON CONFLICT (purpose) DO UPDATE SET
              description = EXCLUDED.description,
              svg_content = EXCLUDED.svg_content
            RETURNING id, purpose, description, svg_content, created_at
        """
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow(sql, purpose, description, svg_content)
            if row is None:
                raise RuntimeError(f"Icon upsert failed for purpose={purpose}")
            return IconRecord(
                id=str(row["id"]),
                purpose=row["purpose"],
                description=row["description"],
                svg_content=row["svg_content"],
                created_at=row["created_at"].isoformat(),
            )
