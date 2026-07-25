"""Unit tests for the pure, LLM-free archetype derivation (slice #285).

No HTTP, no DB, no OpenAI — just dials -> ArchetypeKey. Asserts the function is
total (every valid dial vector yields exactly one key) and that representative
dial vectors map to the expected archetype.
"""

from __future__ import annotations

import itertools

from app.api_contracts import ArchetypeKey, BaselineTasteDials
from app.services.archetype import derive_archetype


def _dials(**overrides) -> BaselineTasteDials:
    base = {
        "bubbles": 0.5,
        "bitterness": 0.5,
        "sweetness": 0.5,
        "body": 0.5,
        "abv_affinity": 0.5,
        "novelty_affinity": 0.5,
        "flavor_family": {
            "malty": 0.2,
            "hoppy": 0.2,
            "roasty": 0.2,
            "fruity": 0.2,
            "sour": 0.2,
            "smoky": 0.2,
        },
    }
    flavor = overrides.pop("flavor_family", None)
    base.update(overrides)
    if flavor is not None:
        base["flavor_family"] = flavor
    return BaselineTasteDials(**base)


def _flavor(dominant: str, weight: float = 0.8) -> dict[str, float]:
    fam = {k: 0.15 for k in ("malty", "hoppy", "roasty", "fruity", "sour", "smoky")}
    fam[dominant] = weight
    return fam


def test_high_novelty_is_adventurer_over_flavor():
    # Novelty appetite overrides any dominant flavor.
    dials = _dials(novelty_affinity=0.9, flavor_family=_flavor("hoppy"))
    assert derive_archetype(dials) is ArchetypeKey.adventurer


def test_dominant_hoppy_is_hop_chaser():
    dials = _dials(novelty_affinity=0.3, bitterness=0.5, flavor_family=_flavor("hoppy"))
    assert derive_archetype(dials) is ArchetypeKey.hop_chaser


def test_dominant_hoppy_and_very_bitter_is_bitter_zealot():
    dials = _dials(novelty_affinity=0.3, bitterness=0.85, flavor_family=_flavor("hoppy"))
    assert derive_archetype(dials) is ArchetypeKey.bitter_zealot


def test_dominant_malty_is_malt_romantic():
    dials = _dials(novelty_affinity=0.3, flavor_family=_flavor("malty"))
    assert derive_archetype(dials) is ArchetypeKey.malt_romantic


def test_dominant_roasty_is_roast_devotee():
    dials = _dials(novelty_affinity=0.3, flavor_family=_flavor("roasty"))
    assert derive_archetype(dials) is ArchetypeKey.roast_devotee


def test_dominant_fruity_is_fruit_forward():
    dials = _dials(novelty_affinity=0.3, flavor_family=_flavor("fruity"))
    assert derive_archetype(dials) is ArchetypeKey.fruit_forward


def test_dominant_sour_is_sour_seeker():
    dials = _dials(novelty_affinity=0.3, flavor_family=_flavor("sour"))
    assert derive_archetype(dials) is ArchetypeKey.sour_seeker


def test_dominant_smoky_is_smoke_wanderer():
    dials = _dials(novelty_affinity=0.3, flavor_family=_flavor("smoky"))
    assert derive_archetype(dials) is ArchetypeKey.smoke_wanderer


def test_no_flavor_lean_big_body_and_abv_is_heavyweight():
    dials = _dials(
        novelty_affinity=0.3,
        body=0.8,
        abv_affinity=0.8,
        flavor_family=_flavor("malty", weight=0.3),
    )
    assert derive_archetype(dials) is ArchetypeKey.heavyweight


def test_light_low_abv_low_bitter_is_easy_drinker():
    dials = _dials(
        novelty_affinity=0.3,
        bitterness=0.2,
        body=0.3,
        abv_affinity=0.3,
        flavor_family=_flavor("malty", weight=0.3),
    )
    assert derive_archetype(dials) is ArchetypeKey.easy_drinker


def test_clean_low_bitter_medium_body_is_crisp_classicist():
    dials = _dials(
        novelty_affinity=0.3,
        bitterness=0.3,
        body=0.6,
        abv_affinity=0.6,
        flavor_family=_flavor("malty", weight=0.3),
    )
    assert derive_archetype(dials) is ArchetypeKey.crisp_classicist


def test_balanced_middle_falls_back_to_balanced_explorer():
    dials = _dials(
        novelty_affinity=0.4,
        bitterness=0.6,
        body=0.5,
        abv_affinity=0.55,
        flavor_family=_flavor("malty", weight=0.3),
    )
    assert derive_archetype(dials) is ArchetypeKey.balanced_explorer


def test_derivation_is_total_over_a_dial_grid():
    # Every combination on a coarse grid yields exactly one valid ArchetypeKey.
    grid = [0.0, 0.25, 0.5, 0.75, 1.0]
    keys = set(ArchetypeKey)
    for bitterness, body, abv, novelty in itertools.product(grid, repeat=4):
        for dominant in ("malty", "hoppy", "roasty", "fruity", "sour", "smoky"):
            dials = _dials(
                bitterness=bitterness,
                body=body,
                abv_affinity=abv,
                novelty_affinity=novelty,
                flavor_family=_flavor(dominant),
            )
            result = derive_archetype(dials)
            assert result in keys
