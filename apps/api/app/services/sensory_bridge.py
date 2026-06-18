"""Cross-sensory bridge for beer embedding text.

Python mirror of packages/db/scripts/seed_catalog/sensory_bridge.ts.
Keep both files in sync; template changes require a full catalog re-embed.
"""

from __future__ import annotations

import re
from typing import Any

HOP_DESCRIPTORS: dict[str, str] = {
    "Citra": "tropical citrus grapefruit passionfruit",
    "Mosaic": "stone fruit mango blueberry tangerine",
    "Saaz": "noble herbal earthy spicy mild",
    "Cascade": "grapefruit citrus floral pine",
    "Centennial": "floral citrus grapefruit clean bitter",
    "Simcoe": "piney resinous passionfruit dank earthy",
    "Galaxy": "passionfruit citrus peach",
    "Amarillo": "orange floral lemon citrus",
    "Hallertau": "noble herbal mild grassy",
    "Magnum": "clean bitter neutral high alpha",
    "Fuggle": "earthy herbal mild traditional",
    "Nelson Sauvin": "white wine gooseberry tropical",
    "Sorachi Ace": "lemon dill cilantro",
    "Chinook": "piney spicy grapefruit",
    "Idaho 7": "tropical pine berry",
    "Strata": "strawberry passionfruit dank",
    "Sabro": "coconut tropical melon stone fruit",
    "Riwaka": "grapefruit lime citrus",
    "Tettnang": "floral noble mild herbal",
    "East Kent Goldings": "earthy floral honey",
}

STYLE_SENSORY_RULES: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(r"imperial\s*stout|russian\s*imperial", re.I),
        "Feels intense like espresso and dark chocolate. Warming like smoked BBQ. "
        "Low carbonation like still water.",
    ),
    (
        re.compile(r"\bstout\b", re.I),
        "Feels rich like dark chocolate and halva. Low carbonation like still water.",
    ),
    (
        re.compile(r"porter|brown\s*ale", re.I),
        "Feels malty like halva and milk chocolate. Moderate bitterness like black coffee.",
    ),
    (
        re.compile(r"double\s*ipa|dipa|triple\s*ipa|\bipa\b|india\s*pale", re.I),
        "Feels like grapefruit juice and dark chocolate bitterness. "
        "Strongly carbonated like im gaz.",
    ),
    (
        re.compile(r"pale\s*ale", re.I),
        "Bright citrus like orange juice. Moderate bitterness like black coffee.",
    ),
    (
        re.compile(r"pilsner|kölsch|kolsch", re.I),
        "Crisp and refreshing like sparkling water. Clean mild bitterness.",
    ),
    (
        re.compile(r"\blager\b", re.I),
        "Crisp and easy like lemonade. Light carbonation.",
    ),
    (
        re.compile(r"wheat|hefeweizen|witbier|weiss", re.I),
        "Soft and fruity like fresh fruit. Lightly carbonated.",
    ),
    (
        re.compile(r"gose", re.I),
        "Tart and bright like pickles and amba. Lively carbonation.",
    ),
    (
        re.compile(r"sour|gueuze|lambic|berliner", re.I),
        "Tart fermented like sauerkraut, pickles, and amba.",
    ),
    (
        re.compile(r"barleywine|old\s*ale", re.I),
        "Rich and warming like dark chocolate. Low carbonation.",
    ),
]


def _hop_descriptor(hop: str) -> str | None:
    for name, desc in HOP_DESCRIPTORS.items():
        if name.lower() == hop.lower():
            return desc
    return None


def _expand_hops(hops: list[str] | None) -> str | None:
    if not hops:
        return None
    expanded: list[str] = []
    for hop in hops[:4]:
        desc = _hop_descriptor(hop)
        expanded.append(f"{hop} ({desc})" if desc else hop)
    if not expanded:
        return None
    return f"Hop character: {', '.join(expanded)}."


def _style_sensory_phrase(style: str) -> str | None:
    for pattern, phrase in STYLE_SENSORY_RULES:
        if pattern.search(style):
            return phrase
    return None


def _bitterness_phrase(ibu: int | float | None, style: str) -> str | None:
    if ibu is not None:
        ibu_val = float(ibu)
        if ibu_val >= 55:
            return "Bitterness like straight espresso or black coffee."
        if ibu_val >= 35:
            return "Bitterness like black coffee."
        if ibu_val >= 20:
            return "Mild bitterness like milky coffee."
        return "Very low bitterness like iced sweet coffee."
    if re.search(r"ipa|imperial|double", style, re.I):
        return "Bitterness like black coffee."
    if re.search(r"stout|porter", style, re.I):
        return "Roasty bitterness like dark chocolate."
    return None


def _body_carbonation_phrase(body: str | None) -> str | None:
    if body == "light":
        return "Light body, lively carbonation like sparkling water."
    if body == "full":
        return "Full body, softer carbonation like still water."
    if body == "medium":
        return "Medium body, moderate carbonation."
    return None


def _sweetness_phrase(sweetness: str | None) -> str | None:
    if sweetness == "sweet":
        return "Sweet finish like milk chocolate."
    if sweetness == "dry":
        return "Dry finish like dark chocolate."
    if sweetness == "balanced":
        return "Balanced sweetness like halva."
    return None


def compose_beer_sensory_bridge(
    *,
    style: str,
    abv: float,
    ibu: int | float | None = None,
    hops: list[str] | None = None,
    body: str | None = None,
    sweetness: str | None = None,
) -> str:
    """Deterministic cross-sensory clause appended to beer embedding text."""
    del abv  # reserved for future ABV-band sensory clauses
    clauses: list[str] = []
    style_phrase = _style_sensory_phrase(style)
    if style_phrase:
        clauses.append(f"Sensory profile: {style_phrase}")

    hop_phrase = _expand_hops(hops)
    if hop_phrase:
        clauses.append(hop_phrase)

    bitter = _bitterness_phrase(ibu, style)
    if bitter:
        clauses.append(bitter)

    body_phrase = _body_carbonation_phrase(body)
    if body_phrase:
        clauses.append(body_phrase)

    sweet = _sweetness_phrase(sweetness)
    if sweet:
        clauses.append(sweet)

    return " ".join(clauses)


def compose_beer_sensory_bridge_from_row(row: dict[str, Any]) -> str:
    return compose_beer_sensory_bridge(
        style=str(row["style"]),
        abv=float(row["abv"]),
        ibu=row.get("ibu"),
        hops=list(row["hops"]) if row.get("hops") else None,
        body=row.get("body"),
        sweetness=row.get("sweetness"),
    )
