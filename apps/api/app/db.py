from __future__ import annotations

import asyncio

import asyncpg  # type: ignore[import-not-found]

from app.config import settings

_pool: asyncpg.Pool | None = None
_pool_lock = asyncio.Lock()


async def get_pool() -> asyncpg.Pool:
    global _pool

    if _pool is not None:
        return _pool

    async with _pool_lock:
        if _pool is None:
            _pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=5)

    return _pool


async def close_pool() -> None:
    global _pool

    if _pool is not None:
        await _pool.close()
        _pool = None
