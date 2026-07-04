"""Pure deck-composition logic for the Tinder-style /rate page.

Deterministic small catalog so the blend is checkable. See
docs/prds/beer-rating-feedback.md (active-learning deck, v1).
"""

from __future__ import annotations

from app.services.match_engine import BeerCandidate
from app.services.rate_deck import build_deck


def _beer(beer_id: str, embedding: list[float]) -> BeerCandidate:
    return BeerCandidate(
        id=beer_id,
        name=beer_id,
        name_hebrew=None,
        brewery="b",
        style="lager",
        abv=5.0,
        market_tier="mainstream",
        color="gold",
        image_url=None,
        adventurousness=0.5,
        embedding=embedding,
    )


def _catalog(n: int) -> list[BeerCandidate]:
    # Spread directions so cosine ordering is well-defined.
    out = []
    for i in range(n):
        vec = [0.0, 0.0, 0.0, 0.0]
        vec[i % 4] = 1.0
        vec[(i + 1) % 4] = 0.1 * (i + 1)
        out.append(_beer(f"b{i}", vec))
    return out


def test_excludes_already_rated() -> None:
    catalog = _catalog(10)
    deck = build_deck([1.0, 0.0, 0.0, 0.0], catalog, rated_ids={"b0", "b1"}, size=6)
    ids = {b.id for b in deck}
    assert "b0" not in ids and "b1" not in ids


def test_returns_requested_size_when_enough() -> None:
    catalog = _catalog(20)
    deck = build_deck([1.0, 0.0, 0.0, 0.0], catalog, rated_ids=set(), size=12)
    assert len(deck) == 12


def test_no_duplicates() -> None:
    catalog = _catalog(20)
    deck = build_deck([1.0, 0.2, 0.0, 0.0], catalog, rated_ids=set(), size=12)
    ids = [b.id for b in deck]
    assert len(ids) == len(set(ids))


def test_includes_top_match_for_exploitation() -> None:
    catalog = _catalog(20)
    baseline = [1.0, 0.0, 0.0, 0.0]
    top = max(catalog, key=lambda b: sum(x * y for x, y in zip(b.embedding, baseline)))
    deck = build_deck(baseline, catalog, rated_ids=set(), size=12)
    assert top.id in {b.id for b in deck}


def test_cold_start_without_baseline_returns_size() -> None:
    catalog = _catalog(20)
    deck = build_deck(None, catalog, rated_ids=set(), size=10)
    assert len(deck) == 10


def test_size_larger_than_catalog_returns_all_available() -> None:
    catalog = _catalog(5)
    deck = build_deck([1.0, 0.0, 0.0, 0.0], catalog, rated_ids={"b0"}, size=12)
    assert len(deck) == 4
