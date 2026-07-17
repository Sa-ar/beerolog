"""Pure dial-space cosine matcher for guest recommendations (slice 1).

Dependency-free: no HTTP, no DB, no OpenAI. Both the user's BaselineTasteDials
and a BeerCandidate are projected into the SAME 12-dimensional dial space and
compared with cosine similarity, then mapped from [-1, 1] to [0, 1].

This is the lightweight matcher used for the guest preview, distinct from the
embedding-based `match_engine.rank` used for authenticated recommendations.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.api_contracts import BaselineTasteDials
from app.services.match_engine import (
    COLOR_DARKNESS,
    BeerCandidate,
    beer_flavor_strengths,
    cosine,
)

# Canonical, FIXED order of the 12 dial dimensions. The first six are the
# flavor_family keys in stable sorted order; the rest are the scalar dials.
# Any vector produced by this module follows exactly this order.
_FLAVOR_KEYS: list[str] = sorted(["malty", "hoppy", "roasty", "fruity", "sour", "smoky"])
# -> ["fruity", "hoppy", "malty", "roasty", "smoky", "sour"]
_SCALAR_KEYS: list[str] = [
    "bubbles",
    "bitterness",
    "sweetness",
    "body",
    "abv_affinity",
    "novelty_affinity",
]
DIAL_VECTOR_ORDER: list[str] = _FLAVOR_KEYS + _SCALAR_KEYS


def dials_to_vector(dials: BaselineTasteDials) -> list[float]:
    """Flatten BaselineTasteDials into the 12-dim canonical vector.

    Order is DIAL_VECTOR_ORDER: the 6 sorted flavor_family keys followed by
    bubbles, bitterness, sweetness, body, abv_affinity, novelty_affinity.
    """
    flavor = dials.flavor_family
    vec = [float(flavor.get(key, 0.0)) for key in _FLAVOR_KEYS]
    vec.extend(float(getattr(dials, key)) for key in _SCALAR_KEYS)
    return vec


# ---------------------------------------------------------------------------
# Beer -> dial-space projection
# ---------------------------------------------------------------------------

# BeerCandidate carries only: style, color (pale/gold/amber/brown/dark), abv,
# adventurousness, market_tier. It has NO body/sweetness enums, so we DERIVE
# those (and the flavor_family weights) from style keywords + color. Values are
# kept deliberately simple and clamped to [0, 1] so they sit in the same space
# as the user dials.


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, x))


def _abv_affinity(abv: float) -> float:
    # Map a typical 3.5-9% ABV range onto [0, 1].
    return _clamp((abv - 3.5) / (9.0 - 3.5))


def beer_dials(beer: BeerCandidate) -> list[float]:
    """Project a BeerCandidate into the same 12-dim dial space.

    Deterministic, documented heuristics mirroring the dial axis semantics:
    flavor_family weights come from style keywords; the scalar dials come from
    color (darkness), style, abv, and adventurousness. All values in [0, 1].
    """
    darkness = COLOR_DARKNESS.get(beer.color, 0.4)
    flavor = beer_flavor_strengths(beer)
    hoppy, roasty, malty, sour = (
        flavor["hoppy"],
        flavor["roasty"],
        flavor["malty"],
        flavor["sour"],
    )

    # --- scalar dials ---
    # Lighter, paler beers read as more carbonated/crisp; dark ales less so.
    bubbles = _clamp(0.8 - darkness * 0.5)
    bitterness = max(hoppy, roasty * 0.7)
    # No sweetness signal on the candidate; derive a mild proxy: sour/dark dry,
    # malty leans a touch sweet, otherwise neutral-low.
    sweetness = _clamp(0.2 + malty * 0.3 - sour * 0.2)
    # Body tracks color darkness and malt backbone.
    body = _clamp(0.3 + darkness * 0.5 + malty * 0.2)
    abv_affinity = _abv_affinity(beer.abv)
    novelty_affinity = _clamp(beer.adventurousness)

    vec = [_clamp(flavor[key]) for key in _FLAVOR_KEYS]
    vec.extend(
        [
            _clamp(bubbles),
            _clamp(bitterness),
            _clamp(sweetness),
            _clamp(body),
            _clamp(abv_affinity),
            _clamp(novelty_affinity),
        ]
    )
    return vec


@dataclass(frozen=True)
class ScoredBeer:
    beer: BeerCandidate
    score: float  # cosine similarity mapped to [0, 1]


def rank_by_dials(
    dials: BaselineTasteDials,
    catalog: list[BeerCandidate],
    limit: int,
) -> list[ScoredBeer]:
    """Score every beer by cosine(dials, beer) and return the top `limit`.

    Pure: no I/O. Cosine in [-1, 1] is mapped to [0, 1] via (cos + 1) / 2.
    Stable sort on (-score) keeps catalog order as the tie-breaker, so equal
    scores rank deterministically.
    """
    user_vec = dials_to_vector(dials)
    scored = [
        ScoredBeer(beer=beer, score=(cosine(user_vec, beer_dials(beer)) + 1.0) / 2.0)
        for beer in catalog
    ]
    scored.sort(key=lambda s: -s.score)
    return scored[:limit]
