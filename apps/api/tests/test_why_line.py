from app.api_contracts import AbvIntent, DominantComponent, SessionIntent, Vibe
from app.services.match_engine import BeerCandidate, MatchResult
from app.services.why_line import build_match_facts, compose_why, explain


def _beer(**overrides: object) -> BeerCandidate:
    base = dict(
        id="ipa-1",
        name="Test IPA",
        brewery="Test Brewery",
        style="IPA",
        abv=5.5,
        market_tier="craft",
        color="gold",
        image_url=None,
        adventurousness=0.7,
        embedding=[0.1] * 8,
    )
    base.update(overrides)
    return BeerCandidate(**base)  # type: ignore[arg-type]


def _result(
    beer: BeerCandidate,
    *,
    dominant: DominantComponent = DominantComponent.baseline,
    baseline_cos: float = 0.5,
    session_cos: float = 0.0,
    abv_fits_intent: bool | None = None,
    novelty_score: float = 0.0,
) -> MatchResult:
    return MatchResult(
        beer=beer,
        baseline_cos=baseline_cos,
        session_cos=session_cos,
        baseline_score=baseline_cos,
        session_score=session_cos,
        abv_score=0.0,
        abv_fits_intent=abv_fits_intent,
        novelty_score=novelty_score,
        avoid_score=0.0,
        total_score=baseline_cos,
        dominant_component=dominant,
    )


def test_baseline_dominant_with_session_carries_vibe() -> None:
    session = SessionIntent(vibe=Vibe.refreshing, abv_intent=AbvIntent.low, free_text="")
    result = explain(DominantComponent.baseline, session=session)
    assert result.code == "baseline_vibe"
    assert result.params["vibe"] == "refreshing"


def test_baseline_dominant_without_session_is_terse() -> None:
    assert explain(DominantComponent.baseline, session=None).code == "baseline"


def test_session_dominant_carries_vibe() -> None:
    session = SessionIntent(vibe=Vibe.adventurous, abv_intent=AbvIntent.high, free_text="")
    result = explain(DominantComponent.session, session=session)
    assert result.code == "session_vibe"
    assert result.params["vibe"] == "adventurous"


def test_novelty_positive_signals_exploration() -> None:
    assert explain(DominantComponent.novelty_positive, session=None).code == "novelty_positive"


def test_novelty_negative_signals_safety() -> None:
    assert explain(DominantComponent.novelty_negative, session=None).code == "novelty_negative"


def test_abv_dominant_carries_abv_intent() -> None:
    session = SessionIntent(vibe=Vibe.refreshing, abv_intent=AbvIntent.low, free_text="")
    result = explain(DominantComponent.abv, session=session)
    assert result.code == "abv"
    assert result.params["abv"] == "low"


def test_build_match_facts_baseline_only_includes_style_and_taste() -> None:
    facts = build_match_facts(
        _result(_beer(), baseline_cos=0.5),
        session=None,
        user_flavor={
            "hoppy": 0.9,
            "malty": 0.2,
            "roasty": 0.2,
            "fruity": 0.3,
            "sour": 0.1,
            "smoky": 0.1,
        },
    )
    codes = [f.code for f in facts]
    assert "style" not in codes
    assert "taste_close" in codes
    assert "flavor_overlap" in codes
    assert "session_vibe" not in codes
    flavor = next(f for f in facts if f.code == "flavor_overlap")
    assert flavor.params["flavor"] == "hoppy"


def test_build_match_facts_with_session_adds_vibe_and_abv() -> None:
    session = SessionIntent(vibe=Vibe.cozy, abv_intent=AbvIntent.medium, free_text="")
    facts = build_match_facts(
        _result(_beer(style="Amber Lager", abv=5.0), abv_fits_intent=True),
        session=session,
        user_flavor=None,
    )
    codes = [f.code for f in facts]
    assert "session_vibe" in codes
    assert "abv_fit" in codes
    vibe = next(f for f in facts if f.code == "session_vibe")
    assert vibe.params["vibe"] == "cozy"


def test_build_match_facts_novelty_signals() -> None:
    boost = build_match_facts(
        _result(_beer(), novelty_score=0.05),
        session=None,
        user_flavor=None,
    )
    assert any(f.code == "novelty_boost" for f in boost)

    safe = build_match_facts(
        _result(_beer(), novelty_score=-0.05),
        session=None,
        user_flavor=None,
    )
    assert any(f.code == "novelty_safe" for f in safe)


def test_compose_why_attaches_llm_text_and_facts() -> None:
    why = compose_why(
        _result(_beer()),
        session=None,
        user_flavor={
            "hoppy": 0.9,
            "malty": 0.2,
            "roasty": 0.2,
            "fruity": 0.3,
            "sour": 0.1,
            "smoky": 0.1,
        },
        text="A hop-forward IPA right in your lane.",
    )
    assert why.code == "baseline"
    assert why.text == "A hop-forward IPA right in your lane."
    assert why.facts
    assert any(f.code == "taste_close" for f in why.facts)
