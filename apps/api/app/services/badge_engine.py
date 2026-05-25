from __future__ import annotations

import math
from dataclasses import dataclass

from app.models.flavor import FlavorVector

EVOLUTION_THRESHOLD = 0.15  # L2 distance between initial and current vectors


@dataclass(frozen=True)
class Badge:
    id: str
    name: str
    icon: str
    description: str


_BAR_EXPLORER_MILESTONES = [
    (
        1.0,
        Badge("bar_explorer_100", "Venue Master", "🏆", "You've tried every beer at this venue."),
    ),
    (0.5, Badge("bar_explorer_50", "Halfway There", "🎯", "You've tried half the tap list.")),
    (0.25, Badge("bar_explorer_25", "Explorer", "🦭", "You've tried a quarter of the tap list.")),
]

_EXPERT_MILESTONES = [
    (
        25,
        Badge(
            "expert_25", "Beer Guru", "🌟", "25 friends took your recommendation. You're a legend."
        ),
    ),
    (10, Badge("expert_10", "Trusted Rec", "🔥", "10 friends tried your pick and loved it.")),
    (5, Badge("expert_5", "Rising Expert", "🍻", "5 friends tried a beer on your recommendation.")),
]


def check_bar_explorer(tried: int, total: int) -> Badge | None:
    if total == 0:
        return None
    ratio = tried / total
    for threshold, badge in _BAR_EXPLORER_MILESTONES:
        if ratio >= threshold:
            return badge
    return None


def check_expert_level(friend_likes: int) -> Badge | None:
    for threshold, badge in _EXPERT_MILESTONES:
        if friend_likes >= threshold:
            return badge
    return None


def _l2_distance(a: list[float], b: list[float]) -> float:
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def check_taste_evolution(
    initial: FlavorVector,
    current: FlavorVector,
    threshold: float = EVOLUTION_THRESHOLD,
) -> Badge | None:
    dist = _l2_distance(initial.to_list(), current.to_list())
    if dist >= threshold:
        return Badge(
            id="taste_evolution",
            name="Taste Evolution",
            icon="🌱",
            description="Your taste profile has evolved since you started. Here's how you've changed.",
        )
    return None
