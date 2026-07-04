"""Active-learning deck for the Tinder-style /rate page (v1).

Returns beers worth rating, not just the top matches: a blend of exploitation
(high match), uncertainty (cosine near the user's median — most informative),
and diversity (spread in embedding space), excluding already-rated beers.

ponytail: v1 uses a simple blend. The full per-card information-gain score
(uncertainty + diversity_from_deck + coverage_gap + novelty_fit) is the upgrade
path — see docs/prds/beer-rating-feedback.md.
"""

from __future__ import annotations

from collections.abc import Sequence

from app.services.match_engine import BeerCandidate, cosine


def build_deck(
    baseline_embedding: list[float] | None,
    catalog: Sequence[BeerCandidate],
    rated_ids: set[str],
    size: int,
) -> list[BeerCandidate]:
    candidates = [b for b in catalog if b.id not in rated_ids]
    if not candidates or size <= 0:
        return []
    # Cold start: no baseline to score against — hand back the seeded order.
    if not baseline_embedding:
        return candidates[:size]

    scored = sorted(
        candidates,
        key=lambda b: cosine(baseline_embedding, b.embedding),
        reverse=True,
    )
    n = len(scored)
    picks: list[BeerCandidate] = []
    seen: set[str] = set()

    def add(beer: BeerCandidate) -> None:
        if beer.id not in seen:
            seen.add(beer.id)
            picks.append(beer)

    # Exploitation: the strongest matches.
    n_exploit = max(1, size // 3)
    for beer in scored[:n_exploit]:
        add(beer)

    # Uncertainty: beers around the median similarity teach the model the most.
    n_uncertain = max(1, size // 3)
    mid = n // 2
    lo = max(0, mid - n_uncertain // 2)
    for beer in scored[lo : lo + n_uncertain]:
        add(beer)

    # Diversity: greedy farthest-point — each pick maximizes its minimum
    # distance (1 - cosine) to everything already chosen.
    remaining = [b for b in scored if b.id not in seen]
    while remaining and len(picks) < size:
        best = max(
            remaining,
            key=lambda b: min(1.0 - cosine(b.embedding, p.embedding) for p in picks),
        )
        add(best)
        remaining = [b for b in remaining if b.id not in seen]

    # Fill any remainder (e.g. size larger than the blends produced) in rank order.
    for beer in scored:
        if len(picks) >= size:
            break
        add(beer)

    return picks[:size]
