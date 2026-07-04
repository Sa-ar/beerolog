"""Pure nudge-math for the rating feedback loop (PRD: beer-rating-feedback.md).

Deterministic low-dim vectors so the geometry is checkable by hand. No DB, no LLM.
"""

from __future__ import annotations

import math

from app.services.match_engine import cosine
from app.services.taste_feedback import (
    apply_batch,
    apply_rating,
    effective_lr,
    nudge,
    rating_signal,
)


def _unit(v: list[float]) -> float:
    return math.sqrt(sum(x * x for x in v))


def test_rating_signal_maps_three_state() -> None:
    assert rating_signal("loved") == 1
    assert rating_signal("fine") == 0
    assert rating_signal("disliked") == -1


def test_loved_moves_toward_beer_and_stays_unit() -> None:
    old = [1.0, 0.0, 0.0, 0.0]
    beer = [0.0, 1.0, 0.0, 0.0]
    new = apply_rating(old, beer, signal=1, lr=0.1, per_rating_cap=0.5)
    assert cosine(new, beer) > cosine(old, beer)
    assert math.isclose(_unit(new), 1.0, abs_tol=1e-9)


def test_disliked_moves_away_from_beer() -> None:
    old = [1.0, 1.0, 0.0, 0.0]
    beer = [0.0, 1.0, 0.0, 0.0]
    new = apply_rating(old, beer, signal=-1, lr=0.1, per_rating_cap=0.5)
    assert cosine(new, beer) < cosine(old, beer)
    assert math.isclose(_unit(new), 1.0, abs_tol=1e-9)


def test_fine_is_a_noop() -> None:
    old = [0.3, 0.7, 0.1, 0.0]
    beer = [0.1, 0.2, 0.9, 0.0]
    new = apply_rating(old, beer, signal=0, lr=0.1, per_rating_cap=0.5)
    assert new == old


def test_disliked_collinear_still_moves() -> None:
    # Disliking a beer that perfectly matches the baseline must NOT be a no-op
    # (the degenerate normalize((1-2lr)*old) == old bug).
    old = [1.0, 0.0, 0.0, 0.0]
    beer = [1.0, 0.0, 0.0, 0.0]
    new = apply_rating(old, beer, signal=-1, lr=0.1, per_rating_cap=0.5)
    assert cosine(new, old) < 1.0 - 1e-6
    assert cosine(new, beer) < 1.0 - 1e-6
    assert math.isclose(_unit(new), 1.0, abs_tol=1e-9)


def test_loved_collinear_is_noop() -> None:
    # Already maximally aligned — nothing to learn.
    old = [1.0, 0.0, 0.0, 0.0]
    beer = [1.0, 0.0, 0.0, 0.0]
    new = apply_rating(old, beer, signal=1, lr=0.1, per_rating_cap=0.5)
    assert cosine(new, old) > 1.0 - 1e-9


def test_per_rating_cap_bounds_movement() -> None:
    old = [1.0, 0.0, 0.0, 0.0]
    beer = [0.0, 1.0, 0.0, 0.0]
    cap = 0.04
    new = apply_rating(old, beer, signal=1, lr=0.9, per_rating_cap=cap)
    # cosine distance from old is capped regardless of the large lr.
    assert cosine(old, new) >= 1.0 - cap - 1e-6


def test_effective_lr_cold_start_and_decay() -> None:
    kw = dict(base_lr=0.08, cold_start_factor=2.0, lr_after_20=0.04, lr_after_50=0.02)
    assert math.isclose(effective_lr(0, **kw), 0.16)
    assert math.isclose(effective_lr(4, **kw), 0.16)
    assert math.isclose(effective_lr(5, **kw), 0.08)
    assert math.isclose(effective_lr(20, **kw), 0.04)
    assert math.isclose(effective_lr(50, **kw), 0.02)


def test_nudge_handles_zero_vector_safely() -> None:
    assert nudge([0.0, 0.0], [1.0, 0.0], 1, 0.1) is not None


def test_apply_batch_moves_toward_loved_beers() -> None:
    old = [1.0, 0.0, 0.0, 0.0]
    beer = [0.0, 1.0, 0.0, 0.0]
    new = apply_batch(old, [(beer, 1), (beer, 1)], lr=0.1, per_rating_cap=0.5)
    assert cosine(new, beer) > cosine(old, beer)
    assert math.isclose(_unit(new), 1.0, abs_tol=1e-9)


def test_apply_batch_balances_loved_and_disliked() -> None:
    old = [1.0, 0.0, 0.0, 0.0]
    loved = [0.0, 1.0, 0.0, 0.0]
    disliked = [0.0, 0.0, 1.0, 0.0]
    new = apply_batch(old, [(loved, 1), (disliked, -1)], lr=0.1, per_rating_cap=0.5)
    assert cosine(new, loved) > cosine(old, loved)
    assert cosine(new, disliked) < cosine(old, disliked)


def test_apply_batch_empty_or_all_fine_is_noop() -> None:
    old = [0.3, 0.7, 0.1, 0.0]
    assert apply_batch(old, [], lr=0.1, per_rating_cap=0.5) == old
    assert apply_batch(old, [(old, 0)], lr=0.1, per_rating_cap=0.5) == old


def test_apply_batch_net_zero_cancels() -> None:
    old = [1.0, 0.0, 0.0, 0.0]
    beer = [0.0, 1.0, 0.0, 0.0]
    new = apply_batch(old, [(beer, 1), (beer, -1)], lr=0.1, per_rating_cap=0.5)
    assert cosine(new, old) > 1.0 - 1e-9


def test_apply_batch_bounded_by_cap() -> None:
    old = [1.0, 0.0, 0.0, 0.0]
    beer = [0.0, 1.0, 0.0, 0.0]
    cap = 0.04
    new = apply_batch(old, [(beer, 1)] * 10, lr=0.9, per_rating_cap=cap)
    assert cosine(old, new) >= 1.0 - cap - 1e-6
