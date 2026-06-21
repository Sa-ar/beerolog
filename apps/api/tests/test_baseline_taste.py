from app.api_contracts import (
    AdventureLevel,
    Carbonation,
    ChocoPref,
    CoffeeStyle,
    FlavorCue,
    LovePref,
    OnboardingAnswers,
    SourWild,
    StrengthPref,
    SweetPref,
)
from app.services.baseline_taste import compose_dials, compose_text

HOP_HEAD = OnboardingAnswers(
    coffee=CoffeeStyle.black,
    chocolate=ChocoPref.dark_90,
    water=Carbonation.strong,
    sour_foods=LovePref.okay,
    smoked_foods=LovePref.love,
    sweet_tooth=SweetPref.dry,
    strength=StrengthPref.strong,
    adventure=AdventureLevel.high,
)

COMFORT_DRINKER = OnboardingAnswers(
    coffee=CoffeeStyle.sweet,
    water=Carbonation.still,
    sour_foods=LovePref.avoid,
    smoked_foods=LovePref.avoid,
    sweet_tooth=SweetPref.rich,
    strength=StrengthPref.light,
    adventure=AdventureLevel.low,
)


def test_hop_head_dials_show_high_bitterness_novelty_strength() -> None:
    dials = compose_dials(HOP_HEAD)
    assert dials.bitterness > 0.7
    assert dials.novelty_affinity > 0.7
    assert dials.bubbles > 0.7
    assert dials.abv_affinity > 0.7
    assert dials.sweetness < 0.4


def test_comfort_drinker_dials_show_low_bitterness_novelty_strength() -> None:
    dials = compose_dials(COMFORT_DRINKER)
    assert dials.bitterness < 0.4
    assert dials.novelty_affinity < 0.3
    assert dials.bubbles < 0.3
    assert dials.abv_affinity < 0.4
    assert dials.sweetness > 0.6


def test_black_vs_sweet_coffee_diverge_on_bitterness() -> None:
    black = compose_dials(HOP_HEAD).bitterness
    sweet = compose_dials(COMFORT_DRINKER).bitterness
    assert black - sweet > 0.4


def test_sweet_tooth_drives_sweetness_and_body() -> None:
    # Isolate sweet_tooth (body is also lifted by strength, so vary one field).
    rich = HOP_HEAD.model_copy(update={"sweet_tooth": SweetPref.rich})
    dry = HOP_HEAD.model_copy(update={"sweet_tooth": SweetPref.dry})
    assert compose_dials(rich).sweetness > compose_dials(dry).sweetness
    assert compose_dials(rich).body > compose_dials(dry).body


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
    assert compose_dials(HOP_HEAD).flavor_family["smoky"] > 0.7


def test_smoked_food_avoider_has_low_smoky_dial() -> None:
    assert compose_dials(COMFORT_DRINKER).flavor_family["smoky"] < 0.3


def test_funky_sour_branch_lifts_sour_dial() -> None:
    base = HOP_HEAD.model_copy(update={"sour_foods": LovePref.love})
    wild = base.model_copy(update={"sour_wild": SourWild.funky})
    assert compose_dials(wild).flavor_family["sour"] >= compose_dials(base).flavor_family["sour"]
    assert compose_dials(wild).flavor_family["sour"] > 0.8


def test_capstone_cues_lift_matching_flavor_family() -> None:
    with_cues = HOP_HEAD.model_copy(update={"flavor_cues": [FlavorCue.caramel, FlavorCue.tropical]})
    base = compose_dials(HOP_HEAD)
    lifted = compose_dials(with_cues)
    assert lifted.flavor_family["malty"] > base.flavor_family["malty"]
    assert lifted.flavor_family["fruity"] > base.flavor_family["fruity"]


def test_compose_text_mentions_coffee_style() -> None:
    assert "black coffee" in compose_text(HOP_HEAD)


def test_compose_text_omits_beer_jargon() -> None:
    text = compose_text(HOP_HEAD).lower()
    for beer_word in ("ipa", "stout", "lager", "hops", "malt"):
        assert beer_word not in text, f"unexpected beer word {beer_word!r}"


def test_compose_text_swaps_novelty_phrase_on_level() -> None:
    assert "new and intense" in compose_text(HOP_HEAD)
    assert "familiar" in compose_text(COMFORT_DRINKER)


def test_compose_text_includes_capstone_cues() -> None:
    answers = HOP_HEAD.model_copy(update={"flavor_cues": [FlavorCue.grapefruit]})
    assert "grapefruit" in compose_text(answers)
