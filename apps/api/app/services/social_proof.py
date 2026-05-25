from __future__ import annotations

from typing import Protocol


class SocialRepo(Protocol):
    async def get_friends(self, user_id: str) -> list[dict]:  # [{id, name}]
        ...
    async def get_positive_ratings(self, user_id: str, beer_id: str, venue_id: str) -> bool: ...


class InMemorySocialRepo:
    def __init__(self) -> None:
        self._friends: dict[str, list[dict]] = {}  # user_id -> [{id, name}]
        self._ratings: list[dict] = []  # {user_id, beer_id, venue_id, rating, visible}

    async def get_friends(self, user_id: str) -> list[dict]:
        return self._friends.get(user_id, [])

    async def get_positive_ratings(self, user_id: str, beer_id: str, venue_id: str) -> bool:
        return any(
            r["user_id"] == user_id
            and r["beer_id"] == beer_id
            and r["venue_id"] == venue_id
            and r["rating"] == "liked"
            and r["visible"]
            for r in self._ratings
        )

    async def add_friend(self, user_id: str, friend_id: str, friend_name: str) -> None:
        self._friends.setdefault(user_id, []).append({"id": friend_id, "name": friend_name})

    async def add_rating(
        self, user_id: str, beer_id: str, venue_id: str, rating: str, visible: bool
    ) -> None:
        self._ratings.append(
            {
                "user_id": user_id,
                "beer_id": beer_id,
                "venue_id": venue_id,
                "rating": rating,
                "visible": visible,
            }
        )


async def get_friend_recommendations(
    user_id: str,
    beer_id: str,
    venue_id: str,
    repo: SocialRepo,
) -> dict:
    friends = await repo.get_friends(user_id)
    recommenders: list[str] = []
    for friend in friends:
        liked = await repo.get_positive_ratings(friend["id"], beer_id, venue_id)
        if liked:
            recommenders.append(friend["name"])
    return {"count": len(recommenders), "names": recommenders}
