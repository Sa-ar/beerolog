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

import numpy as np

from app.services.match_engine import BeerCandidate, cosine

# Recognizable tiers fill the deck first (issue #2: "beers I might know").
# Priority-fill, not hard-filter — craft tops up so the deck is never short and
# every beer stays eventually reachable.
KNOWN_TIERS = frozenset({"mainstream", "import"})

# Farthest-point diversity scans only the top-scored slice, bounding its cost to
# O(size × pool) instead of O(size × catalog) — and keeps diversity picks among
# beers still relevant to the user rather than dredging the long tail.
DIVERSITY_POOL = 64


def _rank_by_cosine(
    baseline_embedding: list[float],
    candidates: list[BeerCandidate],
) -> list[BeerCandidate]:
    """Candidates sorted by cosine similarity to the baseline, descending.

    Vectorized: one matrix–vector product over the catalog instead of a
    per-beer Python loop (issue #1). Stable sort so ties keep input order.
    """
    query = np.asarray(baseline_embedding, dtype=float)
    matrix = np.asarray([b.embedding for b in candidates], dtype=float)
    q_norm = float(np.linalg.norm(query))
    row_norms = np.linalg.norm(matrix, axis=1)
    sims = np.zeros(len(candidates))
    valid = row_norms > 0
    if q_norm > 0:
        sims[valid] = (matrix[valid] @ query) / (row_norms[valid] * q_norm)
    order = np.argsort(-sims, kind="stable")
    return [candidates[i] for i in order]


def build_deck(
    baseline_embedding: list[float] | None,
    catalog: Sequence[BeerCandidate],
    rated_ids: set[str],
    size: int,
) -> list[BeerCandidate]:
    candidates = [b for b in catalog if b.id not in rated_ids]
    if not candidates or size <= 0:
        return []
    known = [b for b in candidates if b.market_tier in KNOWN_TIERS]
    craft = [b for b in candidates if b.market_tier not in KNOWN_TIERS]
    picks = _select(baseline_embedding, known, size)
    if len(picks) < size:
        picks += _select(baseline_embedding, craft, size - len(picks))
    return picks[:size]


def _select(
    baseline_embedding: list[float] | None,
    candidates: Sequence[BeerCandidate],
    size: int,
) -> list[BeerCandidate]:
    if not candidates or size <= 0:
        return []
    # Cold start: no baseline to score against — hand back the seeded order.
    if not baseline_embedding:
        return list(candidates[:size])

    scored = _rank_by_cosine(baseline_embedding, list(candidates))
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
    remaining = [b for b in scored[:DIVERSITY_POOL] if b.id not in seen]
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
