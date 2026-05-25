from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class LeaderboardEntry:
    user_id: str
    username: str
    persona_icon: str
    recommendation_count: int
    rank: int


class LeaderboardRepo(Protocol):
    async def get_venue_positive_counts(
        self, venue_id: str
    ) -> list[dict]:  # [{user_id, count, visible}]
        ...

    async def get_user_info(self, user_id: str) -> dict | None:  # {username, persona_icon}
        ...


class InMemoryLeaderboardRepo:
    def __init__(self) -> None:
        self._ratings: list[dict] = []
        self._users: dict[str, dict] = {}

    async def set_user(self, user_id: str, username: str, persona_icon: str) -> None:
        self._users[user_id] = {"username": username, "persona_icon": persona_icon}

    async def add_rating(self, user_id: str, venue_id: str, rating: str, visible: bool) -> None:
        self._ratings.append(
            {
                "user_id": user_id,
                "venue_id": venue_id,
                "rating": rating,
                "visible": visible,
            }
        )

    async def get_venue_positive_counts(self, venue_id: str) -> list[dict]:
        counts: dict[str, dict] = {}
        for r in self._ratings:
            if r["venue_id"] != venue_id or r["rating"] != "loved":
                continue
            uid = r["user_id"]
            if uid not in counts:
                counts[uid] = {"count": 0, "visible": r["visible"]}
            counts[uid]["count"] += 1
            if r["visible"]:
                counts[uid]["visible"] = True
        return [{"user_id": uid, **data} for uid, data in counts.items()]

    async def get_user_info(self, user_id: str) -> dict | None:
        return self._users.get(user_id)


async def get_leaderboard(
    venue_id: str,
    viewer_id: str,
    repo: LeaderboardRepo,
    top_n: int = 10,
) -> dict:
    raw = await repo.get_venue_positive_counts(venue_id)
    raw_sorted = sorted(raw, key=lambda x: x["count"], reverse=True)

    ranked: list[tuple[int, dict]] = []
    current_rank = 1
    for i, item in enumerate(raw_sorted):
        if i > 0 and item["count"] < raw_sorted[i - 1]["count"]:
            current_rank = i + 1
        ranked.append((current_rank, item))

    viewer_rank: int | None = None
    for rank, item in ranked:
        if item["user_id"] == viewer_id:
            viewer_rank = rank
            break

    public_entries: list[LeaderboardEntry] = []
    for rank, item in ranked:
        if not item["visible"]:
            continue
        if len(public_entries) >= top_n:
            break
        info = await repo.get_user_info(item["user_id"])
        if info is None:
            continue
        public_entries.append(
            LeaderboardEntry(
                user_id=item["user_id"],
                username=info["username"],
                persona_icon=info["persona_icon"],
                recommendation_count=item["count"],
                rank=rank,
            )
        )

    return {"entries": public_entries, "viewer_rank": viewer_rank}
