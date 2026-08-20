"""The offline projection has to stay in lockstep with the composers.

If someone rewords a sentence in `baseline_taste.compose_text` or
`session_intent.compose_text` and forgets the projection table, the harness
would silently score that persona on a neutral vector instead of failing.
These tests make that a red test instead.
"""

from __future__ import annotations

import pytest  # type: ignore[import-not-found]

from tests.eval.offline_embedding import AXES, PHRASE_WEIGHTS, project
from app.api_contracts import (
    AbvIntent,
    AdventureLevel,
    BitternessDirect,
    Carbonation,
    ChocoPref,
    CoffeeStyle,
    LovePref,
    OnboardingAnswers,
    RoastedPref,
    SessionIntent,
    SourWild,
    StrengthPref,
    SweetPref,
    Vibe,
)
from app.services import baseline_taste, session_intent

# Sentences the composers emit that legitimately carry no axis signal.
NON_SIGNAL = {
    "User taste profile",
    "",
}


def _sentences(text: str) -> list[str]:
    return [s.strip().rstrip(".") for s in text.split(". ")]


def _all_baseline_texts():
    base = dict(
        coffee=CoffeeStyle.black,
        water=Carbonation.light,
        sour_foods=LovePref.okay,
        smoked_foods=LovePref.okay,
        sweet_tooth=SweetPref.balanced,
        strength=StrengthPref.medium,
        adventure=AdventureLevel.medium,
    )
    single = {
        "coffee": list(CoffeeStyle),
        "chocolate": list(ChocoPref),
        "bitterness_direct": list(BitternessDirect),
        "roasted": list(RoastedPref),
        "water": list(Carbonation),
        "sweet_tooth": list(SweetPref),
        "strength": list(StrengthPref),
        "adventure": list(AdventureLevel),
        "sour_foods": list(LovePref),
        "smoked_foods": list(LovePref),
    }
    for field, values in single.items():
        for value in values:
            yield baseline_taste.compose_text(OnboardingAnswers(**{**base, field: value}))
    yield baseline_taste.compose_text(
        OnboardingAnswers(**{**base, "sour_foods": LovePref.love, "sour_wild": SourWild.funky})
    )


def test_every_composed_sentence_has_a_projection_entry():
    """Each sentence the baseline composer can emit is either weighted or
    explicitly recorded as carrying no signal."""
    unknown = set()
    for text in _all_baseline_texts():
        head = text.split("Tastes that feel like them:")[0].split("Puts them off:")[0]
        for sentence in _sentences(head):
            if sentence in NON_SIGNAL:
                continue
            if sentence not in PHRASE_WEIGHTS:
                unknown.add(sentence)
    assert not unknown, f"composer sentences missing from the projection table: {sorted(unknown)}"


@pytest.mark.parametrize("vibe", list(Vibe))
def test_every_session_vibe_anchor_has_a_projection_entry(vibe):
    text = session_intent.compose_text(SessionIntent(vibe=vibe, abv_intent=AbvIntent.any))
    anchor = next(s for s in _sentences(text) if s.startswith("Tonight lean toward"))
    assert anchor in PHRASE_WEIGHTS


def test_projection_is_deterministic_across_calls():
    text = "loves bitter drinks like strong black coffee, tonic water, and grapefruit."
    assert project(text) == project(text)


def test_projection_stays_in_unit_range():
    for text in _all_baseline_texts():
        vec = project(text)
        assert len(vec) == len(AXES)
        assert all(0.0 <= v <= 1.0 for v in vec)


def test_bitterness_axis_separates_opposite_personas():
    lover = project("loves bitter drinks like strong black coffee, tonic water, and grapefruit.")
    hater = project("dislikes bitter flavors.")
    idx = AXES.index("bitterness")
    assert lover[idx] > hater[idx]


def test_longest_phrase_wins_over_its_prefix():
    """The funky-sour sentence contains the plain sour sentence as a prefix;
    it must be scored once, as the longer phrase."""
    funky = project(
        "loves sour and fermented foods (pickles, amba, sauerkraut), especially funky, wild, barnyard flavors."
    )
    plain = project("loves sour and fermented foods (pickles, amba, sauerkraut).")
    idx = AXES.index("sour")
    assert funky[idx] > plain[idx]


def test_flavor_cues_only_count_inside_the_cue_sentence():
    with_cue = project("Tastes that feel like them: caramel.")
    without = project("Puts them off: caramel.")
    idx = AXES.index("malty")
    assert with_cue[idx] > without[idx]
