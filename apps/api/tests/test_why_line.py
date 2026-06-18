from app.api_contracts import AbvIntent, DominantComponent, SessionIntent, Vibe
from app.services.why_line import explain


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
