from app.api_contracts import (
    Carbonation,
    CitrusPick,
    CoffeeStyle,
    LovePref,
    OnboardingAnswers,
    SnackPick,
)
from app.services.baseline_taste import compose_dials, compose_text

HOP_HEAD = OnboardingAnswers(
    coffee=CoffeeStyle.black,
    water=Carbonation.strong,
    novelty_seeking=True,
    snack=SnackPick.dark_chocolate,
    sour_foods=LovePref.okay,
    citrus=CitrusPick.grapefruit,
    smoked_foods=LovePref.love,
)

COMFORT_DRINKER = OnboardingAnswers(
    coffee=CoffeeStyle.iced_sweet,
    water=Carbonation.still,
    novelty_seeking=False,
    snack=SnackPick.milk_chocolate,
    sour_foods=LovePref.avoid,
    citrus=CitrusPick.lemonade,
    smoked_foods=LovePref.avoid,
)


def test_hop_head_dials_show_high_bitterness_and_novelty() -> None:
    dials = compose_dials(HOP_HEAD)
    assert dials.bitterness > 0.7
    assert dials.novelty_affinity > 0.7
    assert dials.bubbles > 0.7


def test_comfort_drinker_dials_show_low_bitterness_and_novelty() -> None:
    dials = compose_dials(COMFORT_DRINKER)
    assert dials.bitterness < 0.4
    assert dials.novelty_affinity < 0.3
    assert dials.bubbles < 0.3


def test_flavor_family_has_expected_keys() -> None:
    dials = compose_dials(HOP_HEAD)
    assert set(dials.flavor_family.keys()) == {
        "malty",
        "hoppy",
        "roasty",
        "fruity",
        "sour",
        "smoky",
    }


def test_smoked_food_lover_has_high_smoky_dial() -> None:
    dials = compose_dials(HOP_HEAD)  # smoked_foods=love
    assert dials.flavor_family["smoky"] > 0.7


def test_smoked_food_avoider_has_low_smoky_dial() -> None:
    dials = compose_dials(COMFORT_DRINKER)
    assert dials.flavor_family["smoky"] < 0.3


def test_compose_text_mentions_coffee_style() -> None:
    text = compose_text(HOP_HEAD)
    assert "black coffee" in text


def test_compose_text_omits_beer_jargon() -> None:
    text = compose_text(HOP_HEAD)
    for beer_word in ("IPA", "stout", "lager", "hops", "malt"):
        assert beer_word.lower() not in text.lower(), f"unexpected beer word {beer_word!r}"


def test_compose_text_swaps_novelty_phrase_on_pick() -> None:
    assert "new and intense" in compose_text(HOP_HEAD)
    assert "familiar" in compose_text(COMFORT_DRINKER)
