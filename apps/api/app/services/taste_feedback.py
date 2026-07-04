"""Rating -> baseline-embedding nudge (PRD: beer-rating-feedback.md).

Pure vector math here; the orchestrating service (repos + persistence) lives in
`taste_feedback_service.py`. A rating moves the persisted baseline embedding
toward a loved beer and away from a disliked one; `fine` is a no-op.

Geometry: we move along the component of the beer vector orthogonal to the
current baseline (the tangent direction on the unit sphere). Moving +orthogonal
increases cosine similarity to the beer, -orthogonal decreases it. This avoids
the degenerate `normalize((1-2*lr)*old) == old` case that a naive
`normalize((1-lr)*old - lr*beer)` repulsion hits when the disliked beer is
collinear with the baseline.
"""

from __future__ import annotations

import math

from app.services.match_engine import cosine
from app.services.ratings_repo import RatingValue

_SIGNAL: dict[str, int] = {"loved": 1, "fine": 0, "disliked": -1}
_EPS = 1e-9


def rating_signal(rating: RatingValue) -> int:
    """loved -> +1, fine -> 0 (no-op), disliked -> -1."""
    return _SIGNAL[rating]


def effective_lr(
    rating_count: int,
    *,
    base_lr: float,
    cold_start_factor: float,
    lr_after_20: float,
    lr_after_50: float,
) -> float:
    """Learning rate by experience: fast while cold, decaying as ratings pile up."""
    if rating_count >= 50:
        return lr_after_50
    if rating_count >= 20:
        return lr_after_20
    if rating_count < 5:
        return base_lr * cold_start_factor
    return base_lr


def _norm(v: list[float]) -> float:
    return math.sqrt(sum(x * x for x in v))


def _normalize(v: list[float]) -> list[float]:
    n = _norm(v)
    if n < _EPS:
        return list(v)
    return [x / n for x in v]


def _dot(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b, strict=False))


def _orthogonal_unit(v: list[float]) -> list[float]:
    """A deterministic unit vector orthogonal to v (for the collinear fallback)."""
    vu = _normalize(v)
    # Pick the axis least aligned with v, then project v out of it.
    i = min(range(len(vu)), key=lambda k: abs(vu[k]))
    e = [0.0] * len(vu)
    e[i] = 1.0
    d = _dot(e, vu)
    resid = [e[k] - d * vu[k] for k in range(len(vu))]
    return _normalize(resid)


def nudge(current: list[float], beer: list[float], signal: int, lr: float) -> list[float]:
    """Move `current` toward (signal>0) or away from (signal<0) `beer`.

    Returns a unit vector. `signal == 0` returns `current` unchanged.
    """
    if signal == 0:
        return list(current)
    cur = _normalize(current)
    b = _normalize(beer)
    cos_cb = _dot(cur, b)
    resid = [b[k] - cos_cb * cur[k] for k in range(len(cur))]
    rnorm = _norm(resid)
    if rnorm > _EPS:
        direction = [r / rnorm for r in resid]
    elif signal > 0:
        # Loved a beer already collinear with taste: nothing to learn.
        return cur
    else:
        # Disliked a beer collinear with taste: must still move (floor).
        direction = _orthogonal_unit(cur)
    step = signal * lr
    moved = [cur[k] + step * direction[k] for k in range(len(cur))]
    return _normalize(moved)


def _limit_to_cone(anchor: list[float], vec: list[float], min_cos: float) -> list[float]:
    """Pull `vec` back toward `anchor` until cosine(anchor, vec) >= min_cos.

    cosine(anchor, normalize(lerp(anchor, vec, t))) decreases monotonically from
    1 (t=0) to cosine(anchor, vec) (t=1), so a bisection finds the boundary.
    """
    a = _normalize(anchor)
    v = _normalize(vec)
    if cosine(a, v) >= min_cos:
        return v
    lo, hi = 0.0, 1.0
    for _ in range(48):
        mid = (lo + hi) / 2
        cand = _normalize([a[k] + mid * (v[k] - a[k]) for k in range(len(a))])
        if cosine(a, cand) >= min_cos:
            lo = mid
        else:
            hi = mid
    return _normalize([a[k] + lo * (v[k] - a[k]) for k in range(len(a))])


def apply_rating(
    current: list[float],
    beer: list[float],
    *,
    signal: int,
    lr: float,
    per_rating_cap: float,
) -> list[float]:
    """Nudge + per-rating movement cap. Returns a unit vector (or `current` if no-op)."""
    if signal == 0:
        return list(current)
    moved = nudge(current, beer, signal, lr)
    return _limit_to_cone(current, moved, 1.0 - per_rating_cap)
