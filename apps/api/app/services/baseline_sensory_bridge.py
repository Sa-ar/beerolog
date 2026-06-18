"""Cross-sensory phrases derived from BaselineTaste dials.

Mirrors the everyday language in baseline_taste.compose_text so dial
re-embeds stay aligned with onboarding vocabulary.
"""

from __future__ import annotations

from app.api_contracts import BaselineTasteDials


def _coffee_phrase(bitterness: float) -> str:
    if bitterness >= 0.85:
        return "drinks straight espresso"
    if bitterness >= 0.6:
        return "drinks black coffee"
    if bitterness >= 0.35:
        return "drinks milky coffee (hafuch)"
    if bitterness >= 0.2:
        return "prefers iced sweet coffee"
    return "does not drink coffee"


def _water_phrase(bubbles: float) -> str:
    if bubbles >= 0.65:
        return "prefers strongly carbonated water (im gaz)"
    if bubbles >= 0.35:
        return "prefers lightly sparkling water"
    return "prefers still water"


def _snack_phrase(dials: BaselineTasteDials) -> str:
    families = dials.flavor_family
    if families.get("roasty", 0) >= 0.65:
        return "reaches for dark chocolate"
    if families.get("malty", 0) >= 0.65:
        return "reaches for halva"
    if families.get("fruity", 0) >= 0.65:
        return "reaches for fresh fruit"
    return "reaches for milk chocolate"


def _citrus_phrase(dials: BaselineTasteDials) -> str:
    families = dials.flavor_family
    if families.get("hoppy", 0) >= 0.6:
        return "enjoys grapefruit juice"
    if families.get("fruity", 0) >= 0.6:
        return "enjoys orange juice"
    return "enjoys lemonade"


def _sour_phrase(sour: float) -> str:
    if sour >= 0.7:
        return "loves sour and fermented foods (pickles, amba, sauerkraut)"
    if sour >= 0.35:
        return "is neutral about sour and fermented foods"
    return "avoids sour and fermented foods"


def _smoked_phrase(smoky: float) -> str:
    if smoky >= 0.7:
        return "loves smoked foods (smoked fish, BBQ, peated whisky)"
    if smoky >= 0.35:
        return "is neutral about smoked foods"
    return "avoids smoked foods"


def _novelty_phrase(novelty_affinity: float) -> str:
    if novelty_affinity > 0.5:
        return "seeks out new and intense flavors"
    return "prefers familiar and approachable flavors"


def compose_baseline_sensory_bridge(dials: BaselineTasteDials) -> str:
    """Everyday sensory sentences aligned with onboarding compose_text."""
    return (
        f"{_coffee_phrase(dials.bitterness)}. "
        f"{_water_phrase(dials.bubbles).capitalize()}. "
        f"{_snack_phrase(dials).capitalize()}. "
        f"{_citrus_phrase(dials).capitalize()}. "
        f"{_sour_phrase(dials.flavor_family.get('sour', 0.5))}. "
        f"{_smoked_phrase(dials.flavor_family.get('smoky', 0.5))}. "
        f"{_novelty_phrase(dials.novelty_affinity)}."
    )
