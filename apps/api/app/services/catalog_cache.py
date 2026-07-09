"""In-process TTL cache for the beer catalog.

The catalog (full table + a 1536-d embedding per beer) changes only on
import/deploy, but the deck fetched it from Postgres on every /rate/deck
request — the dominant source of the slow load (issue #1). Load once, reuse
for a TTL window.

ponytail: monotonic-clock TTL, no external cache. No lock either — two
concurrent misses at worst double-load once, which is harmless; add a lock only
if catalog loads ever get expensive enough to matter.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from typing import TypeVar

T = TypeVar("T")


class CatalogCache:
    def __init__(
        self,
        loader: Callable[[], Awaitable[T]],
        ttl_seconds: float,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._loader = loader
        self._ttl = ttl_seconds
        self._clock = clock
        self._value: T | None = None
        self._loaded_at = 0.0

    async def get(self) -> T:
        now = self._clock()
        if self._value is None or now - self._loaded_at >= self._ttl:
            self._value = await self._loader()
            self._loaded_at = now
        return self._value
