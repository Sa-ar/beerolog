from app.api_contracts import AbvIntent, SessionIntent, Vibe
from app.services.session_intent import compose_text


def test_compose_text_contains_vibe_phrase() -> None:
    intent = SessionIntent(vibe=Vibe.refreshing, abv_intent=AbvIntent.low, free_text="")
    text = compose_text(intent)
    assert "refreshing" in text
    assert "low-alcohol" in text


def test_compose_text_includes_free_text_when_present() -> None:
    intent = SessionIntent(
        vibe=Vibe.cozy, abv_intent=AbvIntent.medium, free_text="after a long Tel Aviv heatwave"
    )
    text = compose_text(intent)
    assert "long Tel Aviv heatwave" in text


def test_compose_text_skips_empty_free_text() -> None:
    intent = SessionIntent(vibe=Vibe.adventurous, abv_intent=AbvIntent.high, free_text="   ")
    text = compose_text(intent)
    assert "More context" not in text


def test_compose_text_preserves_hebrew_input() -> None:
    intent = SessionIntent(
        vibe=Vibe.familiar, abv_intent=AbvIntent.any, free_text="ערב חם בתל אביב"
    )
    text = compose_text(intent)
    assert "ערב חם בתל אביב" in text
