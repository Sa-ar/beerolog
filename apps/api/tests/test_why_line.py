from app.api_contracts import AbvIntent, DominantComponent, SessionIntent, Vibe
from app.services.why_line import explain


def test_baseline_dominant_with_session_mentions_vibe() -> None:
    session = SessionIntent(vibe=Vibe.refreshing, abv_intent=AbvIntent.low, free_text="")
    assert "refreshing" in explain(DominantComponent.baseline, session=session)


def test_baseline_dominant_without_session_is_terse() -> None:
    assert explain(DominantComponent.baseline, session=None) == "Matches your usual style."


def test_session_dominant_mentions_vibe() -> None:
    session = SessionIntent(vibe=Vibe.adventurous, abv_intent=AbvIntent.high, free_text="")
    assert "adventurous" in explain(DominantComponent.session, session=session)


def test_novelty_positive_signals_exploration() -> None:
    assert "bolder" in explain(DominantComponent.novelty_positive, session=None)


def test_novelty_negative_signals_safety() -> None:
    assert "safe" in explain(
        DominantComponent.novelty_negative, session=None
    ) or "familiar" in explain(DominantComponent.novelty_negative, session=None)


def test_abv_dominant_mentions_abv_intent() -> None:
    session = SessionIntent(vibe=Vibe.refreshing, abv_intent=AbvIntent.low, free_text="")
    assert "low" in explain(DominantComponent.abv, session=session)
