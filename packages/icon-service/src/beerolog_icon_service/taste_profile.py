from __future__ import annotations

from beerolog_icon_service.models import IconRequest

FLAVOR_LABELS: dict[str, str] = {
    "malty": "Malty",
    "hoppy": "Hoppy",
    "roasty": "Roasty",
    "fruity": "Fruity",
    "sour": "Sour",
    "smoky": "Smoky",
}

ICON_STYLE_STROKE = "hsl(25 85% 50%)"
ICON_STYLE_FILL_LIGHT = "hsl(38 92% 96%)"
ICON_STYLE_FILL_MID = "hsl(38 92% 90%)"
ICON_STYLE_STROKE_WIDTH = "2.25"

FLAVOR_ACCENTS: dict[str, str] = {
    "sour": "hsl(48 96% 58%)",
    "hoppy": "hsl(92 42% 40%)",
    "malty": "hsl(38 78% 52%)",
    "roasty": "hsl(22 48% 28%)",
    "fruity": "hsl(355 72% 52%)",
    "smoky": "hsl(24 88% 48%)",
    "leaf": "hsl(100 35% 38%)",
}

VIBE_ACCENTS: dict[str, str] = {
    "refreshing": "hsl(195 78% 58%)",
    "cozy": "hsl(28 72% 48%)",
    "adventurous": "hsl(265 58% 52%)",
    "familiar": "hsl(38 78% 55%)",
}

ABV_ACCENT = "hsl(28 70% 45%)"


def _novelty_label(novelty_affinity: float) -> str:
    return "flavor explorer" if novelty_affinity > 0.5 else "comfort seeker"


def _flavor_label(key: str) -> str:
    return FLAVOR_LABELS.get(key, key)


def _top_flavors(flavor_family: dict[str, float], limit: int = 4) -> list[tuple[str, float]]:
    return sorted(flavor_family.items(), key=lambda kv: kv[1], reverse=True)[:limit]


def resolve_taste_profile_icon_requests(
    *,
    bubbles: float,
    bitterness: float,
    flavor_family: dict[str, float],
    novelty_affinity: float,
) -> list[IconRequest]:
    """Map baseline taste dials to icon purpose keys and generation descriptions."""

    _ = bubbles, bitterness  # reserved for future dial-specific icons

    top = _top_flavors(flavor_family, limit=4)
    if not top:
        return []

    novelty = _novelty_label(novelty_affinity)
    dominant_key = top[0][0]
    secondary_key = top[1][0] if len(top) > 1 else None
    hero_keys = (
        f"{dominant_key}+{secondary_key}" if secondary_key else dominant_key
    )
    hero_purpose = f"taste-profile:hero:{hero_keys}"
    hero_description = f"Profile icon: {hero_keys}, {novelty}. 32×32 beer line-art."

    requests: list[IconRequest] = [
        IconRequest(
            purpose=hero_purpose,
            description=hero_description,
            slot="hero",
        )
    ]

    seen_purposes: set[str] = {hero_purpose}
    for key, _value in top:
        purpose = f"taste-profile:flavor:{key}"
        if purpose in seen_purposes:
            continue
        seen_purposes.add(purpose)
        label = _flavor_label(key)
        requests.append(
            IconRequest(
                purpose=purpose,
                description=(
                    f"Hand-drawn beer taste icon representing {label.lower()} "
                    f"flavor family. Simple line-art SVG."
                ),
                flavor_key=key,
                slot="flavor",
            )
        )

    return requests
