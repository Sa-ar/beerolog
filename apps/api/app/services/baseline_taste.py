"""BaselineTaste composer.

Maps onboarding answers to a synthetic preference text and a set of
user-facing dials. The synthetic text becomes the input to the embedding
model; the dials remain editable in the UI.

Pure functions. No I/O.
"""

from __future__ import annotations

from app.api_contracts import (
    BaselineTasteDials,
    Carbonation,
    CitrusPick,
    CoffeeStyle,
    LovePref,
    OnboardingAnswers,
    SnackPick,
)

_COFFEE_BITTER = {
    CoffeeStyle.black: 0.95,
    CoffeeStyle.espresso: 0.85,
    CoffeeStyle.hafuch: 0.45,
    CoffeeStyle.iced_sweet: 0.20,
    CoffeeStyle.none: 0.50,
}

_WATER_BUBBLES = {
    Carbonation.still: 0.1,
    Carbonation.light: 0.5,
    Carbonation.strong: 0.9,
}

_LOVE_WEIGHT = {LovePref.love: 0.9, LovePref.okay: 0.5, LovePref.avoid: 0.1}


def compose_dials(answers: OnboardingAnswers) -> BaselineTasteDials:
    """Reduce onboarding answers to numeric dials."""

    bitterness = _COFFEE_BITTER[answers.coffee]
    if answers.snack == SnackPick.dark_chocolate:
        bitterness = max(bitterness, 0.7)
    if answers.citrus == CitrusPick.grapefruit:
        bitterness = max(bitterness, 0.65)

    bubbles = _WATER_BUBBLES[answers.water]

    flavor_family = {
        "malty": 0.7 if answers.snack in (SnackPick.halva, SnackPick.milk_chocolate) else 0.4,
        "hoppy": 0.7 if answers.citrus in (CitrusPick.grapefruit, CitrusPick.orange) else 0.3,
        "roasty": 0.8
        if answers.coffee in (CoffeeStyle.black, CoffeeStyle.espresso)
        or answers.snack == SnackPick.dark_chocolate
        else 0.3,
        "fruity": 0.7
        if answers.snack == SnackPick.fresh_fruit or answers.citrus == CitrusPick.orange
        else 0.3,
        "sour": _LOVE_WEIGHT[answers.sour_foods],
        "smoky": _LOVE_WEIGHT[answers.smoked_foods],
    }

    novelty_affinity = 0.85 if answers.novelty_seeking else 0.15

    return BaselineTasteDials(
        bubbles=bubbles,
        bitterness=bitterness,
        flavor_family=flavor_family,
        novelty_affinity=novelty_affinity,
    )


def compose_text(answers: OnboardingAnswers) -> str:
    """Compose the synthetic preference text fed to the embedding model.

    The text intentionally uses non-beer sensory language so that the
    multilingual embedding model captures the user's profile via familiar
    flavor / aroma anchors rather than beer-style jargon.
    """

    coffee_phrase = {
        CoffeeStyle.black: "drinks black coffee",
        CoffeeStyle.espresso: "drinks straight espresso",
        CoffeeStyle.hafuch: "drinks milky coffee (hafuch)",
        CoffeeStyle.iced_sweet: "prefers iced sweet coffee",
        CoffeeStyle.none: "does not drink coffee",
    }[answers.coffee]

    water_phrase = {
        Carbonation.still: "prefers still water",
        Carbonation.light: "prefers lightly sparkling water",
        Carbonation.strong: "prefers strongly carbonated water (im gaz)",
    }[answers.water]

    snack_phrase = {
        SnackPick.dark_chocolate: "reaches for dark chocolate",
        SnackPick.halva: "reaches for halva",
        SnackPick.fresh_fruit: "reaches for fresh fruit",
        SnackPick.milk_chocolate: "reaches for milk chocolate",
    }[answers.snack]

    citrus_phrase = {
        CitrusPick.grapefruit: "enjoys grapefruit juice",
        CitrusPick.orange: "enjoys orange juice",
        CitrusPick.lemonade: "enjoys lemonade",
        CitrusPick.none: "avoids citrus juice",
    }[answers.citrus]

    sour_phrase = {
        LovePref.love: "loves sour and fermented foods (pickles, amba, sauerkraut)",
        LovePref.okay: "is neutral about sour and fermented foods",
        LovePref.avoid: "avoids sour and fermented foods",
    }[answers.sour_foods]

    smoked_phrase = {
        LovePref.love: "loves smoked foods (smoked fish, BBQ, peated whisky)",
        LovePref.okay: "is neutral about smoked foods",
        LovePref.avoid: "avoids smoked foods",
    }[answers.smoked_foods]

    novelty_phrase = (
        "seeks out new and intense flavors"
        if answers.novelty_seeking
        else "prefers familiar and approachable flavors"
    )

    return (
        f"User taste profile. {coffee_phrase}. {water_phrase}. "
        f"{snack_phrase}. {citrus_phrase}. {sour_phrase}. {smoked_phrase}. "
        f"{novelty_phrase}."
    )
