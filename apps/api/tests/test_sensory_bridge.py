from app.services.sensory_bridge import compose_beer_sensory_bridge


def test_ipa_bridge_uses_cross_sensory_language() -> None:
    text = compose_beer_sensory_bridge(
        style="American IPA",
        abv=6.2,
        ibu=65,
        hops=["Citra", "Mosaic"],
        body="medium",
        sweetness="dry",
    )
    assert "Sensory profile:" in text
    assert "grapefruit juice" in text
    assert "Citra (tropical citrus grapefruit passionfruit)" in text
    assert "black coffee" in text


def test_lager_bridge_mentions_lemonade() -> None:
    text = compose_beer_sensory_bridge(style="Lager", abv=5.0, ibu=12, hops=None, body="light", sweetness=None)
    assert "lemonade" in text


def test_unknown_style_still_emits_ibu_bridge() -> None:
    text = compose_beer_sensory_bridge(style="Other", abv=5.0, ibu=40, hops=None, body=None, sweetness=None)
    assert "black coffee" in text
