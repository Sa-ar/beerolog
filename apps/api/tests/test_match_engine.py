"""Tests for the Match engine — the load-bearing module.

Tests pin behavior, not implementation: we verify how ranking changes when
α, β, NoveltyAffinity, and adventurousness move, not the specific dot
product values.
"""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]

from app.api_contracts import DominantComponent
from app.services.match_engine import BeerCandidate, rank


def _beer(
    name: str,
    embedding: list[float],
    adventurousness: float = 0.0,
) -> BeerCandidate:
    return BeerCandidate(
        id=name.lower(),
        name=name,
        brewery="x",
        style="y",
        abv=5.0,
        market_tier="craft",
        image_url=None,
        adventurousness=adventurousness,
        embedding=embedding,
    )


BASELINE_LEANING = _beer("BaselineMatch", [1.0, 0.0, 0.0])
SESSION_LEANING = _beer("SessionMatch", [0.0, 1.0, 0.0])
NEUTRAL = _beer("Neutral", [0.5, 0.5, 0.0])


def test_alpha_one_returns_pure_baseline_ranking() -> None:
    results = rank(
        baseline_embedding=[1.0, 0.0, 0.0],
        session_embedding=[0.0, 1.0, 0.0],
        novelty_affinity=0.5,
        catalog=[BASELINE_LEANING, SESSION_LEANING],
        alpha=1.0,
        beta=0.0,
    )
    assert results[0].beer.id == "baselinematch"


def test_alpha_zero_returns_pure_session_ranking() -> None:
    results = rank(
        baseline_embedding=[1.0, 0.0, 0.0],
        session_embedding=[0.0, 1.0, 0.0],
        novelty_affinity=0.5,
        catalog=[BASELINE_LEANING, SESSION_LEANING],
        alpha=0.0,
        beta=0.0,
    )
    assert results[0].beer.id == "sessionmatch"


def test_null_session_falls_back_to_baseline_only() -> None:
    results = rank(
        baseline_embedding=[1.0, 0.0, 0.0],
        session_embedding=None,
        novelty_affinity=0.5,
        catalog=[BASELINE_LEANING, SESSION_LEANING, NEUTRAL],
        alpha=0.3,  # would normally favor session
        beta=0.0,
    )
    assert results[0].beer.id == "baselinematch"


def test_novelty_reranks_among_equal_cosine_beers() -> None:
    # Two beers with identical cosine; the more adventurous one should win
    # when novelty_affinity > 0.5 and β > 0.
    tame = _beer("Tame", [1.0, 0.0, 0.0], adventurousness=0.0)
    bold = _beer("Bold", [1.0, 0.0, 0.0], adventurousness=1.0)
    results = rank(
        baseline_embedding=[1.0, 0.0, 0.0],
        session_embedding=None,
        novelty_affinity=1.0,
        catalog=[tame, bold],
        alpha=1.0,
        beta=0.3,
    )
    assert results[0].beer.id == "bold"


def test_low_novelty_suppresses_adventurous_beers() -> None:
    tame = _beer("Tame", [1.0, 0.0, 0.0], adventurousness=0.0)
    bold = _beer("Bold", [1.0, 0.0, 0.0], adventurousness=1.0)
    results = rank(
        baseline_embedding=[1.0, 0.0, 0.0],
        session_embedding=None,
        novelty_affinity=0.0,  # low novelty
        catalog=[tame, bold],
        alpha=1.0,
        beta=0.3,
    )
    assert results[0].beer.id == "tame"


def test_beta_zero_disables_novelty_rerank() -> None:
    tame = _beer("Tame", [1.0, 0.0, 0.0], adventurousness=0.0)
    bold = _beer("Bold", [1.0, 0.0, 0.0], adventurousness=1.0)
    results = rank(
        baseline_embedding=[1.0, 0.0, 0.0],
        session_embedding=None,
        novelty_affinity=1.0,
        catalog=[tame, bold],
        alpha=1.0,
        beta=0.0,
    )
    # Identical scores; ordering is stable by insertion order
    assert {r.beer.id for r in results} == {"tame", "bold"}
    assert results[0].total_score == pytest.approx(results[1].total_score)


def test_top_k_truncates_results() -> None:
    catalog = [_beer(f"B{i}", [1.0, 0.0, 0.0]) for i in range(10)]
    results = rank(
        baseline_embedding=[1.0, 0.0, 0.0],
        session_embedding=None,
        novelty_affinity=0.5,
        catalog=catalog,
        alpha=1.0,
        beta=0.0,
        top_k=3,
    )
    assert len(results) == 3


def test_dominant_component_marks_baseline_when_alpha_high() -> None:
    results = rank(
        baseline_embedding=[1.0, 0.0, 0.0],
        session_embedding=[0.0, 1.0, 0.0],
        novelty_affinity=0.5,
        catalog=[BASELINE_LEANING],
        alpha=0.8,
        beta=0.0,
    )
    assert results[0].dominant_component == DominantComponent.baseline


def test_dominant_component_marks_novelty_positive_when_it_dominates() -> None:
    bold = _beer("Bold", [0.0, 1.0, 0.0], adventurousness=1.0)
    results = rank(
        baseline_embedding=[1.0, 0.0, 0.0],  # orthogonal → cos = 0
        session_embedding=None,
        novelty_affinity=1.0,
        catalog=[bold],
        alpha=1.0,
        beta=0.5,
    )
    assert results[0].dominant_component == DominantComponent.novelty_positive
