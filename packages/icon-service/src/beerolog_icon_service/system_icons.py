from __future__ import annotations

from beerolog_icon_service.models import IconRequest
from beerolog_icon_service.taste_profile import FLAVOR_LABELS

_VIBE_DESCRIPTIONS: dict[str, str] = {
    "refreshing": "crisp sparkling refreshment, light and bubbly",
    "cozy": "warm cozy comfort, gentle steam rising",
    "adventurous": "bold compass or starburst, seeking new flavors",
    "familiar": "welcoming home, safe and approachable",
}

_ABV_DESCRIPTIONS: dict[str, str] = {
    "low": "single low bar, light easy-drinking strength",
    "medium": "two medium bars, balanced alcohol level",
    "high": "three full bars, strong bold strength",
    "any": "open circle or dash, no ABV preference",
}

_JOURNEY_DESCRIPTIONS: dict[str, str] = {
    "quiz": "clipboard or checklist with a checkmark, taste quiz step",
    "vibe": "three horizontal sliders or toggles, session mood picker",
    "picks": "ranked beer glasses numbered one two three, top picks step",
}


def resolve_system_icon_requests() -> list[IconRequest]:
    """Canonical catalog icons shared across the product UI."""

    requests: list[IconRequest] = []

    for key, detail in _VIBE_DESCRIPTIONS.items():
        requests.append(
            IconRequest(
                purpose=f"session:vibe:{key}",
                description=(
                    f"Hand-drawn beer session vibe icon for {key}: {detail}. "
                    "Simple line-art SVG."
                ),
                catalog_group="session.vibe",
                catalog_key=key,
                slot="catalog",
            )
        )

    for key, detail in _ABV_DESCRIPTIONS.items():
        requests.append(
            IconRequest(
                purpose=f"session:abv:{key}",
                description=(
                    f"Hand-drawn beer ABV intent icon for {key}: {detail}. "
                    "Simple line-art SVG."
                ),
                catalog_group="session.abv",
                catalog_key=key,
                slot="catalog",
            )
        )

    for key, detail in _JOURNEY_DESCRIPTIONS.items():
        requests.append(
            IconRequest(
                purpose=f"journey:{key}",
                description=(
                    f"Hand-drawn Beerolog journey step icon for {key}: {detail}. "
                    "Simple line-art SVG."
                ),
                catalog_group="journey",
                catalog_key=key,
                slot="catalog",
            )
        )

    for key in FLAVOR_LABELS:
        label = FLAVOR_LABELS[key]
        requests.append(
            IconRequest(
                purpose=f"taste-profile:flavor:{key}",
                description=(
                    f"Hand-drawn beer taste icon representing {label.lower()} "
                    f"flavor family. Simple line-art SVG."
                ),
                flavor_key=key,
                catalog_group="flavor",
                catalog_key=key,
                slot="catalog",
            )
        )

    requests.append(
        IconRequest(
            purpose="marketing:taste-quiz-hero",
            description=(
                "Hand-drawn hero illustration for an empty-state taste quiz card: "
                "dashed questionnaire card with flavor hints and a question mark, "
                "beer-adjacent but friendly. Simple line-art SVG, viewBox 0 0 32 32."
            ),
            catalog_group="marketing",
            catalog_key="taste-quiz-hero",
            slot="catalog",
        )
    )

    return requests
