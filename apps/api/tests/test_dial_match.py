"""Unit tests for the pure dial-space cosine matcher (guest-preview slice 1).

No HTTP, no DB, no OpenAI — just the dial->vector mapping and ranking.
Catalog fixtures are hand-built BeerCandidate instances and slices of the
existing PLACEHOLDER_CATALOG.
"""

from __future__ import annotations

from app.api_contracts import BaselineTasteDials
from app.placeholder_catalog import PLACEHOLDER_CATALOG
from app.services.dial_match import (
    DIAL_VECTOR_ORDER,
    ScoredBeer,
    beer_dials,
    dials_to_vector,
    rank_by_dials,
)


def _dials(**overrides) -> BaselineTasteDials:
    base = {
        "bubbles": 0.5,
        "bitterness": 0.5,
        "sweetness": 0.5,
        "body": 0.5,
        "abv_affinity": 0.5,
        "novelty_affinity": 0.5,
        "flavor_family": {
            "malty": 0.5,
            "hoppy": 0.5,
            "roasty": 0.5,
            "fruity": 0.5,
            "sour": 0.5,
            "smoky": 0.5,
        },
    }
    flavor = overrides.pop("flavor_family", None)
    base.update(overrides)
    if flavor is not None:
        base["flavor_family"].update(flavor)
    return BaselineTasteDials(**base)


def _beer(beer_id: str):
    return next(b for b in PLACEHOLDER_CATALOG if b.id == beer_id)


def test_canonical_vector_order_is_stable_and_length_12():
    # 6 sorted flavor-family keys, then 5 scalar dials + novelty_affinity.
    assert DIAL_VECTOR_ORDER == [
        "fruity",
        "hoppy",
        "malty",
        "roasty",
        "smoky",
        "sour",
        "bubbles",
        "bitterness",
        "sweetness",
        "body",
        "abv_affinity",
        "novelty_affinity",
    ]
    assert len(DIAL_VECTOR_ORDER) == 12
    vec = dials_to_vector(_dials())
    assert len(vec) == 12
    assert all(isinstance(x, float) for x in vec)


def test_vector_values_map_to_canonical_positions():
    dials = _dials(
        bitterness=0.9,
        flavor_family={"hoppy": 0.8},
    )
    vec = dials_to_vector(dials)
    assert vec[DIAL_VECTOR_ORDER.index("hoppy")] == 0.8
    assert vec[DIAL_VECTOR_ORDER.index("bitterness")] == 0.9


def test_hoppy_bitter_dials_rank_ipa_above_light_lager():
    dials = _dials(
        bitterness=0.95,
        bubbles=0.45,
        flavor_family={"hoppy": 0.95, "fruity": 0.7, "malty": 0.3},
        abv_affinity=0.7,
        novelty_affinity=0.6,
    )
    catalog = [_beer("alexander-blazer"), _beer("maccabee")]
    ranked = rank_by_dials(dials, catalog, limit=2)
    assert ranked[0].beer.id == "alexander-blazer"
    assert ranked[1].beer.id == "maccabee"
    assert ranked[0].score > ranked[1].score


def test_all_scores_in_unit_interval():
    dials = _dials()
    ranked = rank_by_dials(dials, PLACEHOLDER_CATALOG, limit=len(PLACEHOLDER_CATALOG))
    assert ranked
    for scored in ranked:
        assert isinstance(scored, ScoredBeer)
        assert 0.0 <= scored.score <= 1.0


def test_beer_dials_values_in_unit_interval():
    for beer in PLACEHOLDER_CATALOG:
        vec = beer_dials(beer)
        assert len(vec) == 12
        assert all(0.0 <= x <= 1.0 for x in vec), beer.id


def test_limit_truncation_returns_exactly_limit():
    dials = _dials()
    ranked = rank_by_dials(dials, PLACEHOLDER_CATALOG, limit=3)
    assert len(ranked) == 3
    # Limit larger than catalog returns the whole catalog.
    ranked_all = rank_by_dials(dials, PLACEHOLDER_CATALOG, limit=100)
    assert len(ranked_all) == len(PLACEHOLDER_CATALOG)


def test_ranking_is_deterministic():
    dials = _dials(bitterness=0.8, flavor_family={"hoppy": 0.7})
    first = rank_by_dials(dials, PLACEHOLDER_CATALOG, limit=5)
    second = rank_by_dials(dials, PLACEHOLDER_CATALOG, limit=5)
    assert [s.beer.id for s in first] == [s.beer.id for s in second]
    assert [s.score for s in first] == [s.score for s in second]
