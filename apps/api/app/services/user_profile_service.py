from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Protocol


class UserProfileRepo(Protocol):
    async def get_profile(self, user_id: str) -> list[float] | None: ...
    async def save_profile(self, user_id: str, vector: list[float]) -> None: ...
    async def get_history(self, user_id: str) -> list[dict]: ...
    async def add_to_history(self, user_id: str, beer_id: str, rating: str | None) -> None: ...
    async def get_suppressions(self, user_id: str) -> dict[str, int]: ...
    async def set_suppressions(self, user_id: str, suppressions: dict[str, int]) -> None: ...


class InMemoryUserProfileRepo:
    def __init__(self) -> None:
        self._profiles: dict[str, list[float]] = {}
        self._history: dict[str, list[dict]] = {}
        self._suppressions: dict[str, dict[str, int]] = {}

    async def get_profile(self, user_id: str) -> list[float] | None:
        return self._profiles.get(user_id)

    async def save_profile(self, user_id: str, vector: list[float]) -> None:
        self._profiles[user_id] = vector

    async def get_history(self, user_id: str) -> list[dict]:
        return self._history.get(user_id, [])

    async def add_to_history(self, user_id: str, beer_id: str, rating: str | None) -> None:
        entry = {'beer_id': beer_id, 'rating': rating, 'tried_at': datetime.now(timezone.utc).isoformat()}
        self._history.setdefault(user_id, []).append(entry)

    async def get_suppressions(self, user_id: str) -> dict[str, int]:
        return dict(self._suppressions.get(user_id, {}))

    async def set_suppressions(self, user_id: str, suppressions: dict[str, int]) -> None:
        self._suppressions[user_id] = suppressions


async def get_profile(repo: UserProfileRepo, user_id: str) -> list[float] | None:
    return await repo.get_profile(user_id)


async def save_profile(repo: UserProfileRepo, user_id: str, vector: list[float]) -> None:
    await repo.save_profile(user_id, vector)


async def get_history(repo: UserProfileRepo, user_id: str) -> list[dict]:
    return await repo.get_history(user_id)


async def add_to_history(
    repo: UserProfileRepo,
    user_id: str,
    beer_id: str,
    rating: str | None = None,
) -> None:
    await repo.add_to_history(user_id, beer_id, rating)
