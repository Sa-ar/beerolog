"""Session differentiation tests — opposite picks should diverge."""

from __future__ import annotations

from app.api_contracts import AbvIntent, DominantComponent, Vibe
from app.services.match_engine import BeerCandidate, rank


def _beer(
    beer_id: str,
    embedding: list[float],
    *,
    abv: float = 5.0,
    adventurousness: float = 0.0,
) -> BeerCandidate:
    return BeerCandidate(
        id=beer_id,
        name=beer_id,
        brewery="x",
        style="y",
        abv=abv,
        market_tier="craft",
        color="gold",
        image_url=None,
        adventurousness=adventurousness,
        embedding=embedding,
    )


REFRESHING_BEER = _beer("refreshing", [0.0, 1.0, 0.0], abv=4.0)
COZY_BEER = _beer("cozy", [0.0, 0.0, 1.0], abv=8.0)
NEUTRAL_BEER = _beer("neutral", [0.5, 0.5, 0.5], abv=5.5)
CATALOG = [REFRESHING_BEER, COZY_BEER, NEUTRAL_BEER]


def test_opposite_sessions_have_limited_overlap() -> None:
    baseline = [1.0, 0.0, 0.0]
    refreshing_session = [0.0, 1.0, 0.0]
    cozy_session = [0.0, 0.0, 1.0]

    refreshing_results = rank(
        baseline_embedding=baseline,
        session_embedding=refreshing_session,
        novelty_affinity=0.5,
        catalog=CATALOG,
        alpha=0.4,
        beta=0.0,
        top_k=2,
        abv_intent=AbvIntent.low,
        abv_weight=0.15,
    )
    cozy_results = rank(
        baseline_embedding=baseline,
        session_embedding=cozy_session,
        novelty_affinity=0.5,
        catalog=CATALOG,
        alpha=0.4,
        beta=0.0,
        top_k=2,
        abv_intent=AbvIntent.high,
        abv_weight=0.15,
    )

    refreshing_ids = {r.beer.id for r in refreshing_results}
    cozy_ids = {r.beer.id for r in cozy_results}
    assert len(refreshing_ids & cozy_ids) <= 2
    assert refreshing_results[0].beer.id == "refreshing"
    assert cozy_results[0].beer.id == "cozy"


def test_session_or_abv_can_dominate_with_session_present() -> None:
    results = rank(
        baseline_embedding=[1.0, 0.0, 0.0],
        session_embedding=[0.0, 1.0, 0.0],
        novelty_affinity=0.5,
        catalog=[REFRESHING_BEER],
        alpha=0.2,
        beta=0.0,
        abv_intent=AbvIntent.low,
        abv_weight=0.15,
    )
    assert results[0].dominant_component in (
        DominantComponent.session,
        DominantComponent.abv,
    )


def test_abv_band_prefers_matching_strength() -> None:
    low = _beer("low", [0.5, 0.5, 0.0], abv=4.0)
    high = _beer("high", [0.5, 0.5, 0.0], abv=8.0)
    results = rank(
        baseline_embedding=[0.5, 0.5, 0.0],
        session_embedding=[0.5, 0.5, 0.0],
        novelty_affinity=0.5,
        catalog=[low, high],
        alpha=0.5,
        beta=0.0,
        abv_intent=AbvIntent.low,
        abv_weight=0.2,
    )
    assert results[0].beer.id == "low"
