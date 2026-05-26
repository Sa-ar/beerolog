from __future__ import annotations

from typing import Literal

from .user_profile_service import UserProfileRepo

ALPHA = 0.1  # learning rate for vector nudge
SUPPRESSION_TTL = 5  # sessions before suppression expires


def _nudge(
    current: list[float], target: list[float], alpha: float, direction: float
) -> list[float]:
    """Move current vector toward (direction=+1) or away (direction=-1) from target."""
    return [max(0.0, min(1.0, c + direction * alpha * (t - c))) for c, t in zip(current, target)]


async def apply_rating(
    repo: UserProfileRepo,
    user_id: str,
    beer: dict,
    rating: Literal["loved", "fine", "disliked"],
    alpha: float = ALPHA,
) -> list[float] | None:
    current = await repo.get_profile(user_id)
    updated = current

    if current is not None and rating != "fine":
        beer_fv = beer["flavor_vector"]
        direction = 1.0 if rating == "loved" else -1.0
        updated = _nudge(current, beer_fv, alpha, direction)
        await repo.save_profile(user_id, updated)

    if rating == "disliked":
        suppressions = await repo.get_suppressions(user_id)
        suppressions[beer["style"]] = SUPPRESSION_TTL
        await repo.set_suppressions(user_id, suppressions)

    await repo.add_to_history(user_id, beer["id"], rating)
    return updated  # None for anonymous users (no profile)
