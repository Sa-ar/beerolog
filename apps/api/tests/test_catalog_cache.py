"""In-process TTL cache for the beer catalog (issue #1: slow deck loading).

The catalog changes only on import/deploy, so refetching it (full table +
1536-d embeddings) on every /rate/deck request was the deck's main latency.
"""

from __future__ import annotations

import asyncio

from app.services.catalog_cache import CatalogCache


def test_loads_once_within_ttl() -> None:
    async def scenario() -> None:
        calls = 0

        async def loader() -> list[int]:
            nonlocal calls
            calls += 1
            return [calls]

        now = {"t": 0.0}
        cache = CatalogCache(loader, ttl_seconds=10.0, clock=lambda: now["t"])

        first = await cache.get()
        now["t"] = 9.9  # still inside the TTL window
        second = await cache.get()

        assert first == second == [1]
        assert calls == 1  # loader hit once, not per request

    asyncio.run(scenario())


def test_refetches_after_ttl_expires() -> None:
    async def scenario() -> None:
        calls = 0

        async def loader() -> list[int]:
            nonlocal calls
            calls += 1
            return [calls]

        now = {"t": 0.0}
        cache = CatalogCache(loader, ttl_seconds=10.0, clock=lambda: now["t"])

        await cache.get()
        now["t"] = 10.1  # TTL elapsed
        again = await cache.get()

        assert again == [2]
        assert calls == 2

    asyncio.run(scenario())
