"""Avoid-penalty in match_engine.rank(): a flavor family the user rates below
neutral down-ranks beers strong in it, proportional to dislike intensity.
See docs/quiz-roasted-dislike-research.md.
"""

from app.services.match_engine import BeerCandidate, rank

_EMB = [0.5, 0.5]  # identical embeddings -> cosine ties; only the penalty separates


def _beer(beer_id: str, style: str, color: str) -> BeerCandidate:
    return BeerCandidate(
        id=beer_id,
        name=beer_id,
        brewery="x",
        style=style,
        abv=5.0,
        market_tier="core",
        color=color,
        image_url=None,
        adventurousness=0.3,
        embedding=_EMB,
    )


def _rank(user_flavor, avoid_weight=0.4):
    return rank(
        baseline_embedding=_EMB,
        session_embedding=None,
        novelty_affinity=0.5,
        catalog=[_beer("stout", "Imperial Stout", "dark"), _beer("lager", "Lager", "gold")],
        alpha=0.6,
        beta=0.3,
        top_k=2,
        user_flavor=user_flavor,
        avoid_weight=avoid_weight,
        avoid_neutral=0.35,
    )


def test_strong_dislike_downranks_coffee_forward_beer() -> None:
    # roasty=0.05 ("really dislike") is well below neutral 0.35 -> the coffee-
    # forward imperial stout must fall below the neutral lager despite equal cosine.
    res = _rank({"roasty": 0.05})
    assert res[0].beer.id == "lager"
    assert res[0].avoid_score < res[1].avoid_score  # stout carries the bigger penalty


def test_penalty_scales_with_dislike_intensity() -> None:
    faint = _rank({"roasty": 0.30})  # just below neutral -> small penalty
    strong = _rank({"roasty": 0.05})  # far below -> large penalty
    stout_faint = next(r for r in faint if r.beer.id == "stout")
    stout_strong = next(r for r in strong if r.beer.id == "stout")
    assert stout_strong.avoid_score > stout_faint.avoid_score > 0.0


def test_neutral_or_above_is_no_op() -> None:
    res = _rank({"roasty": 0.4})  # at/above neutral -> no penalty, stable order
    assert all(r.avoid_score == 0.0 for r in res)
    assert res[0].beer.id == "stout"  # input order preserved on a cosine tie
