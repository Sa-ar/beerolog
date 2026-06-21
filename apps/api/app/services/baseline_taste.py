"""BaselineTaste composer.

Maps onboarding answers to a synthetic preference text and a set of
user-facing dials. The synthetic text becomes the input to the embedding
model; the dials are surfaced in the UI.

Pure functions. No I/O.
"""

from __future__ import annotations

from app.api_contracts import (
    AdventureLevel,
    AvoidCue,
    BaselineTasteDials,
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

# Bumped whenever the quiz/scoring model changes shape. Profiles persisted with a
# lower version are treated as stale and routed back through onboarding.
TASTE_MODEL_VERSION = 2

# Coffee sweetener is the single strongest bitterness-liking proxy (UK Biobank):
# black skews high, sweetened skews low.
_COFFEE_BITTER = {
    CoffeeStyle.black: 0.95,
    CoffeeStyle.milk_based: 0.45,
    CoffeeStyle.sweet: 0.20,
    CoffeeStyle.none: 0.50,
}
_CHOCO_BITTER = {
    ChocoPref.dark_90: 0.85,
    ChocoPref.dark_70: 0.65,
    ChocoPref.milk: 0.30,
    ChocoPref.none: 0.50,
}
_WATER_BUBBLES = {Carbonation.still: 0.1, Carbonation.light: 0.5, Carbonation.strong: 0.9}
_LOVE_WEIGHT = {LovePref.love: 0.9, LovePref.okay: 0.5, LovePref.avoid: 0.1}
_SWEETNESS = {SweetPref.rich: 0.85, SweetPref.balanced: 0.5, SweetPref.dry: 0.15}
_BODY = {SweetPref.rich: 0.8, SweetPref.balanced: 0.5, SweetPref.dry: 0.25}
_STRENGTH_ABV = {StrengthPref.light: 0.15, StrengthPref.medium: 0.5, StrengthPref.strong: 0.85}
_ADVENTURE = {AdventureLevel.low: 0.15, AdventureLevel.medium: 0.5, AdventureLevel.high: 0.85}


def compose_dials(answers: OnboardingAnswers) -> BaselineTasteDials:
    """Reduce onboarding answers to numeric dials."""

    avoids = set(answers.avoids)
    cues = set(answers.flavor_cues)

    bitterness = _COFFEE_BITTER[answers.coffee]
    if answers.chocolate is not None:
        bitterness = max(bitterness, _CHOCO_BITTER[answers.chocolate])
    if AvoidCue.too_bitter in avoids:
        bitterness = min(bitterness, 0.3)

    bubbles = _WATER_BUBBLES[answers.water]

    sweetness = _SWEETNESS[answers.sweet_tooth]
    if AvoidCue.too_sweet in avoids:
        sweetness = min(sweetness, 0.3)

    body = _BODY[answers.sweet_tooth]
    if answers.strength == StrengthPref.strong:
        body = max(body, 0.7)
    elif answers.strength == StrengthPref.light:
        body = min(body, 0.4)
    if AvoidCue.too_heavy in avoids:
        body = min(body, 0.3)

    abv_affinity = _STRENGTH_ABV[answers.strength]

    # Sour liking doubles as a sensation-seeking / novelty signal.
    novelty_affinity = _ADVENTURE[answers.adventure]
    if answers.sour_foods == LovePref.love:
        novelty_affinity = max(novelty_affinity, 0.6)

    malty = (
        0.7
        if answers.sweet_tooth == SweetPref.rich
        or cues & {FlavorCue.caramel, FlavorCue.bread_crust}
        or answers.chocolate == ChocoPref.milk
        else 0.4
    )
    hoppy = (
        0.7
        if cues & {FlavorCue.grapefruit, FlavorCue.pine, FlavorCue.citrus_zest}
        else (0.5 if answers.coffee == CoffeeStyle.black else 0.35)
    )
    roasty = 0.3
    if (
        answers.coffee == CoffeeStyle.black
        or answers.chocolate in (ChocoPref.dark_90, ChocoPref.dark_70)
        or FlavorCue.coffee in cues
    ):
        roasty = 0.8
    if AvoidCue.too_dark in avoids:
        roasty = min(roasty, 0.3)
    fruity = 0.7 if cues & {FlavorCue.tropical, FlavorCue.banana_bread} else 0.3
    if answers.sour_foods == LovePref.love:
        fruity = max(fruity, 0.55)
    sour = _LOVE_WEIGHT[answers.sour_foods]
    if answers.sour_wild == SourWild.funky:
        sour = max(sour, 0.9)
    smoky = _LOVE_WEIGHT[answers.smoked_foods]

    flavor_family = {
        "malty": malty,
        "hoppy": hoppy,
        "roasty": roasty,
        "fruity": fruity,
        "sour": sour,
        "smoky": smoky,
    }

    return BaselineTasteDials(
        bubbles=bubbles,
        bitterness=bitterness,
        sweetness=sweetness,
        body=body,
        abv_affinity=abv_affinity,
        flavor_family=flavor_family,
        novelty_affinity=novelty_affinity,
    )


_COFFEE_PHRASE = {
    CoffeeStyle.black: "drinks black coffee and likes real bitterness",
    CoffeeStyle.milk_based: "takes coffee with milk",
    CoffeeStyle.sweet: "prefers sweet, creamy coffee",
    CoffeeStyle.none: "does not drink coffee",
}
_CHOCO_PHRASE = {
    ChocoPref.dark_90: "reaches for very dark chocolate",
    ChocoPref.dark_70: "enjoys dark chocolate",
    ChocoPref.milk: "prefers milk chocolate",
    ChocoPref.none: "is not a chocolate person",
}
_WATER_PHRASE = {
    Carbonation.still: "prefers still, flat drinks",
    Carbonation.light: "likes a little fizz",
    Carbonation.strong: "loves strongly fizzy drinks",
}
_SWEET_PHRASE = {
    SweetPref.rich: "has a sweet tooth and likes rich, full-bodied flavors",
    SweetPref.balanced: "likes balanced sweetness",
    SweetPref.dry: "prefers dry, crisp, not-sweet drinks",
}
_STRENGTH_PHRASE = {
    StrengthPref.light: "wants light, easy-drinking strength",
    StrengthPref.medium: "is happy with medium strength",
    StrengthPref.strong: "wants strong, intense drinks",
}
_SOUR_PHRASE = {
    LovePref.love: "loves sour and fermented foods (pickles, amba, sauerkraut)",
    LovePref.okay: "is neutral about sour and fermented foods",
    LovePref.avoid: "avoids sour and fermented foods",
}
_SOUR_WILD_PHRASE = {
    SourWild.bright: ", especially bright, citrusy sourness",
    SourWild.funky: ", especially funky, wild, barnyard flavors",
}
_SMOKED_PHRASE = {
    LovePref.love: "loves smoked foods (smoked fish, BBQ, peated whisky)",
    LovePref.okay: "is neutral about smoked foods",
    LovePref.avoid: "avoids smoked foods",
}
_ADVENTURE_PHRASE = {
    AdventureLevel.low: "prefers familiar and approachable flavors",
    AdventureLevel.medium: "is open to some new flavors",
    AdventureLevel.high: "seeks out new and intense flavors",
}
_CUE_WORD = {
    FlavorCue.grapefruit: "grapefruit",
    FlavorCue.caramel: "caramel",
    FlavorCue.pine: "pine",
    FlavorCue.tropical: "tropical fruit",
    FlavorCue.banana_bread: "banana bread",
    FlavorCue.citrus_zest: "citrus zest",
    FlavorCue.coffee: "roasted coffee",
    FlavorCue.bread_crust: "bread crust",
}
_AVOID_WORD = {
    AvoidCue.too_bitter: "too bitter",
    AvoidCue.too_sweet: "too sweet",
    AvoidCue.too_heavy: "too heavy",
    AvoidCue.too_dark: "too dark",
}


def compose_text(answers: OnboardingAnswers) -> str:
    """Compose the synthetic preference text fed to the embedding model.

    Uses everyday, non-beer sensory language so the multilingual embedding model
    anchors on familiar flavor cues rather than beer-style jargon. Built from the
    combination of answers, including the optional refinements and capstone cues.
    """

    parts = ["User taste profile."]
    parts.append(_COFFEE_PHRASE[answers.coffee] + ".")
    if answers.chocolate is not None:
        parts.append(_CHOCO_PHRASE[answers.chocolate] + ".")
    parts.append(_WATER_PHRASE[answers.water] + ".")
    parts.append(_SWEET_PHRASE[answers.sweet_tooth] + ".")
    parts.append(_STRENGTH_PHRASE[answers.strength] + ".")

    sour = _SOUR_PHRASE[answers.sour_foods]
    if answers.sour_foods == LovePref.love and answers.sour_wild is not None:
        sour += _SOUR_WILD_PHRASE[answers.sour_wild]
    parts.append(sour + ".")

    parts.append(_SMOKED_PHRASE[answers.smoked_foods] + ".")
    parts.append(_ADVENTURE_PHRASE[answers.adventure] + ".")

    if answers.flavor_cues:
        chosen = ", ".join(_CUE_WORD[c] for c in answers.flavor_cues)
        parts.append(f"Tastes that feel like them: {chosen}.")
    if answers.avoids:
        chosen = ", ".join(_AVOID_WORD[a] for a in answers.avoids)
        parts.append(f"Puts them off: {chosen}.")

    return " ".join(parts)
