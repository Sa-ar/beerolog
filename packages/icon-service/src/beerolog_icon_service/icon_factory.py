"""Icon factory — canonical SVG artwork for all known purposes.

TypeScript mirror: packages/icons/src/icon-factory.ts
"""

from __future__ import annotations

from beerolog_icon_service.taste_profile import (
    ABV_ACCENT,
    FLAVOR_ACCENTS,
    ICON_STYLE_FILL_LIGHT,
    ICON_STYLE_FILL_MID,
    ICON_STYLE_STROKE,
    ICON_STYLE_STROKE_WIDTH,
    VIBE_ACCENTS,
)

_S = ICON_STYLE_STROKE
_W = ICON_STYLE_STROKE_WIDTH
_L = ICON_STYLE_FILL_LIGHT
_M = ICON_STYLE_FILL_MID
_A = FLAVOR_ACCENTS
_V = VIBE_ACCENTS


def _wrap(view_box: str, body: str) -> str:
    return (
        f'<svg viewBox="{view_box}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
        f"{body}</svg>"
    )


def _flavor_bodies() -> dict[str, str]:
    return {
        "sour": f'<path d="M16 5c-7 0-12 6-12 13 0 4 2 8 5 10 2 1 4 2 7 2s5-1 7-2c3-2 5-6 5-10 0-7-5-13-12-13z" fill="{_A["sour"]}" stroke="{_S}" stroke-width="{_W}" stroke-linejoin="round"/><path d="M16 8v16M11 13l5 11M21 13l-5 11M8 16h16" stroke="{_S}" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/><path d="M16 5c-3-3-6-3-8-1" stroke="{_A["leaf"]}" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M16 5c3-3 6-3 8-1" stroke="{_A["leaf"]}" stroke-width="2" stroke-linecap="round" fill="none"/>',
        "hoppy": f'<path d="M16 4v4" stroke="{_S}" stroke-width="{_W}" stroke-linecap="round"/><path d="M10 11q6-4 12 0-6 4-12 0z" fill="{_A["hoppy"]}" stroke="{_S}" stroke-width="{_W}" stroke-linejoin="round"/><path d="M8 17q8-5 16 0-8 5-16 0z" fill="{_A["hoppy"]}" stroke="{_S}" stroke-width="{_W}" stroke-linejoin="round"/><path d="M9 23q7-4 14 0-7 4-14 0z" fill="{_A["hoppy"]}" stroke="{_S}" stroke-width="{_W}" stroke-linejoin="round"/><circle cx="16" cy="6" r="2" fill="{_A["leaf"]}" stroke="{_S}" stroke-width="1.25"/>',
        "malty": f'<path d="M16 28V11" stroke="{_S}" stroke-width="{_W}" stroke-linecap="round"/><ellipse cx="11" cy="10" rx="3.5" ry="6" fill="{_A["malty"]}" stroke="{_S}" stroke-width="{_W}" transform="rotate(-22 11 10)"/><ellipse cx="16" cy="8" rx="3.5" ry="6.5" fill="{_A["malty"]}" stroke="{_S}" stroke-width="{_W}"/><ellipse cx="21" cy="10" rx="3.5" ry="6" fill="{_A["malty"]}" stroke="{_S}" stroke-width="{_W}" transform="rotate(22 21 10)"/><path d="M10 26h12" stroke="{_S}" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>',
        "roasty": f'<path d="M16 6c-6 0-9 5-9 11s3 11 9 11 9-5 9-11-3-11-9-11z" fill="{_A["roasty"]}" stroke="{_S}" stroke-width="{_W}"/><path d="M16 8c2.5 5 2.5 15 0 20" stroke="hsl(38 40% 75%)" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.7"/><path d="M22 12c2 2 3 5 3 8" stroke="{_S}" stroke-width="1.5" stroke-linecap="round" fill="none" opacity="0.4"/>',
        "fruity": f'<circle cx="16" cy="18" r="9" fill="{_A["fruity"]}" stroke="{_S}" stroke-width="{_W}"/><path d="M16 9v5" stroke="{_S}" stroke-width="{_W}" stroke-linecap="round"/><path d="M16 9c4-4 8-3 9 0" fill="{_A["leaf"]}" stroke="{_S}" stroke-width="1.25"/><ellipse cx="13" cy="17" rx="2" ry="3" fill="hsl(355 60% 65%)" opacity="0.5"/>',
        "smoky": f'<path d="M16 27c-5-7-3-13 0-17 2 3 2 7-1 10 2-3 3-7 2-11 3 5 5 10 3 15 1 2-1 3-4 3z" fill="{_A["smoky"]}" stroke="{_S}" stroke-width="{_W}" stroke-linejoin="round"/><path d="M16 24c-2-4-1-8 1-11 1 2 1 5-1 7 1-2 2-5 1-8 1 3 2 6 0 9-1 2-2 3-1 3z" fill="hsl(48 95% 70%)" opacity="0.75"/><path d="M10 26h12" stroke="{_S}" stroke-width="1.5" stroke-linecap="round" opacity="0.35"/>',
        "default": f'<path d="M10 9h12v15c0 2.5-2.5 4.5-6 4.5s-6-2-6-4.5V9z" fill="{_L}" stroke="{_S}" stroke-width="{_W}"/><path d="M10 14h12" stroke="{_S}" stroke-width="1.5" opacity="0.4"/><path d="M22 11h2.5c1.5 0 2.5 1.2 2.5 2.8v4.4c0 1.6-1 2.8-2.5 2.8H22" stroke="{_S}" stroke-width="{_W}" fill="none"/>',
    }


def _vibe_bodies() -> dict[str, str]:
    return {
        "refreshing": f'<path d="M11 7h10l-2.5 19c0 2.2-2 3.5-2.5 3.5s-2.5-1.3-2.5-3.5L11 7z" fill="hsl(195 85% 94%)" stroke="{_S}" stroke-width="{_W}" stroke-linejoin="round"/><path d="M12 13h8" stroke="{_V["refreshing"]}" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/><circle cx="14" cy="11" r="1.6" fill="{_V["refreshing"]}" stroke="{_S}" stroke-width="0.75"/><circle cx="18" cy="9.5" r="1.3" fill="{_V["refreshing"]}" stroke="{_S}" stroke-width="0.75"/><circle cx="17" cy="15" r="1.1" fill="{_V["refreshing"]}" opacity="0.85"/><path d="M23 8l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="{_V["refreshing"]}" stroke="{_S}" stroke-width="0.75"/>',
        "cozy": f'<path d="M8 15h16v9c0 2.2-2.2 4-8 4s-8-1.8-8-4v-9z" fill="{_V["cozy"]}" stroke="{_S}" stroke-width="{_W}" stroke-linejoin="round"/><path d="M8 19h16" stroke="{_S}" stroke-width="1.25" opacity="0.35"/><path d="M24 17h3c1.2 0 2 1 2 2.2v3.6c0 1.2-.8 2.2-2 2.2h-3" stroke="{_S}" stroke-width="{_W}" fill="none"/><path d="M12 9c0 2.5-1.5 4-1.5 6M16 7c0 3-1.5 5-1.5 7M20 9c0 2.5-1.5 4-1.5 6" stroke="hsl(38 30% 70%)" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M11 9c1.5-1 3-1 5 0M17 9c2-1 3.5-1 5 0" stroke="{_S}" stroke-width="1.25" stroke-linecap="round" opacity="0.4"/>',
        "adventurous": f'<circle cx="16" cy="16" r="9" fill="{_L}" stroke="{_S}" stroke-width="{_W}"/><path d="M16 8l2 7H25l-6 4.5 2 7.5L16 20l-5 6.5 2-7.5-6-4.5h7z" fill="{_V["adventurous"]}" stroke="{_S}" stroke-width="{_W}" stroke-linejoin="round"/><circle cx="16" cy="16" r="2" fill="{_S}"/>',
        "familiar": f'<path d="M5 15l11-8 11 8v11c0 1.8-1.5 3-3 3H8c-1.5 0-3-1.2-3-3V15z" fill="{_V["familiar"]}" stroke="{_S}" stroke-width="{_W}" stroke-linejoin="round"/><rect x="13" y="20" width="6" height="9" rx="1" fill="{_M}" stroke="{_S}" stroke-width="1.25"/><rect x="11" y="17" width="4" height="3" rx="0.5" fill="hsl(48 90% 70%)" stroke="{_S}" stroke-width="1"/><path d="M20 8v4" stroke="{_S}" stroke-width="1.5" stroke-linecap="round" opacity="0.45"/>',
    }


def _abv_glass() -> str:
    return (
        f'<path d="M12 7h8l-1.5 17c0 1.3-1.1 2.3-2.5 2.3s-2.5-1-2.5-2.3L12 7z" '
        f'fill="{_L}" stroke="{_S}" stroke-width="{_W}" stroke-linejoin="round"/>'
    )


def _abv_liquid(top_y: int) -> str:
    return (
        f'<path d="M12.5 {top_y} L11.5 26.3 L20.5 26.3 L19.5 {top_y} Z" fill="{ABV_ACCENT}" '
        f'stroke="{_S}" stroke-width="0.75" opacity="0.95"/>'
        f'<path d="M12.5 {top_y} Q16 {top_y - 1.5} 19.5 {top_y}" fill="{ABV_ACCENT}" '
        f'stroke="{_S}" stroke-width="0.5" opacity="0.35"/>'
    )


def _abv_body(level: str) -> str:
    glass = _abv_glass()
    if level == "any":
        return (
            f"{glass}"
            f'<path d="M11.5 16.5h9" stroke="{_S}" stroke-width="1.75" stroke-linecap="round" '
            f'stroke-dasharray="2.5 2"/>'
            f'<path d="M13.5 13.5c0-1.5 1.2-2.5 2.5-2.5s2.5 1 2.5 2.5-1.2 2.5-2.5 2.5" '
            f'stroke="{_S}" stroke-width="1.25" fill="none" stroke-linecap="round"/>'
        )
    top = {"low": 21, "medium": 17, "high": 13}.get(level, 21)
    return f"{glass}{_abv_liquid(top)}"


def _journey_bodies() -> dict[str, str]:
    return {
        "quiz": f'<rect x="8" y="6" width="20" height="26" rx="3" fill="{_L}" stroke="{_S}" stroke-width="{_W}"/><path d="M12 14h12M12 19h8M12 24h10" stroke="{_S}" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/><circle cx="24" cy="24" r="5" fill="{_S}"/><path d="M22.5 24l1.5 1.5 3-3" stroke="white" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/>',
        "vibe": f'<rect x="6" y="10" width="24" height="5" rx="2.5" fill="{_M}" stroke="{_S}" stroke-width="1.25"/><circle cx="14" cy="12.5" r="3.5" fill="{_S}"/><rect x="6" y="18" width="24" height="5" rx="2.5" fill="{_M}" stroke="{_S}" stroke-width="1.25"/><circle cx="22" cy="20.5" r="3.5" fill="{_S}"/><rect x="6" y="26" width="24" height="5" rx="2.5" fill="{_M}" stroke="{_S}" stroke-width="1.25"/><circle cx="18" cy="28.5" r="3.5" fill="{_S}"/>',
        "picks": f'<path d="M12 8h12v16c0 2-2 3-6 3s-6-1-6-3V8z" fill="{_L}" stroke="{_S}" stroke-width="{_W}"/><path d="M12 12h12" stroke="{_S}" stroke-width="1.25" opacity="0.4"/><rect x="8" y="14" width="3.5" height="3.5" rx="0.5" fill="{_S}" opacity="0.85"/><text x="9.75" y="17.2" font-size="5" fill="white" font-weight="bold">1</text><rect x="8" y="19" width="3.5" height="3.5" rx="0.5" fill="{_S}" opacity="0.65"/><text x="9.75" y="22.2" font-size="5" fill="white" font-weight="bold">2</text><rect x="8" y="24" width="3.5" height="3.5" rx="0.5" fill="{_S}" opacity="0.45"/><text x="9.75" y="27.2" font-size="5" fill="white" font-weight="bold">3</text>',
    }


def _marketing_bodies() -> dict[str, str]:
    return {
        "taste-quiz-hero": f'<ellipse cx="100" cy="148" rx="56" ry="8" fill="{_M}"/><rect x="62" y="48" width="76" height="88" rx="10" fill="{_L}" stroke="{_S}" stroke-width="2" stroke-dasharray="6 4"/><path d="M62 68 Q100 58 138 68" fill="none" stroke="{_S}" stroke-width="2" opacity="0.5"/><circle cx="84" cy="92" r="6" fill="{_S}" opacity="0.2"/><circle cx="116" cy="102" r="5" fill="{_S}" opacity="0.15"/><text x="100" y="98" text-anchor="middle" font-size="28" fill="hsl(25 50% 15%)" opacity="0.35">?</text><circle cx="148" cy="28" r="18" fill="{_M}" stroke="{_S}" stroke-width="2"/><path d="M144 24c2-4 6-6 8-4" fill="none" stroke="{_S}" stroke-width="1.5" stroke-linecap="round"/><circle cx="36" cy="36" r="16" fill="{_M}" stroke="{_S}" stroke-width="2"/><rect x="31" y="32" width="10" height="8" rx="2" fill="{_S}" opacity="0.25"/><circle cx="100" cy="16" r="14" fill="{_S}"/><path d="M96 16l3 3 5-6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    }


def _flavor_body(key: str) -> str:
    return _flavor_bodies().get(key) or _flavor_bodies()["default"]


def _build_hero_composite_body(primary: str, secondary: str) -> str:
    clip_id = f"hero-clip-{primary}-{secondary}"
    primary_body = _flavor_body(primary)
    secondary_body = _flavor_body(secondary)
    return (
        f'<g transform="translate(16 16) scale(0.85) translate(-16 -16)">{primary_body}</g>'
        f'<g transform="translate(24 24)">'
        f'<circle cx="0" cy="0" r="7.5" fill="{_L}" stroke="{_S}" stroke-width="1.5"/>'
        f'<clipPath id="{clip_id}"><circle cx="0" cy="0" r="6.5"/></clipPath>'
        f'<g clip-path="url(#{clip_id})">'
        f'<g transform="scale(0.5) translate(-16 -16)">{secondary_body}</g>'
        f"</g></g>"
    )


def build_hero_svg(keys: list[str]) -> str | None:
    if not keys:
        return None
    primary = keys[0]
    secondary = keys[1] if len(keys) > 1 else None
    if not secondary:
        return _wrap("0 0 32 32", _flavor_body(primary))
    return _wrap("0 0 32 32", _build_hero_composite_body(primary, secondary))


def build_icon_registry() -> dict[str, str]:
    """Map canonical purpose keys to SVG strings."""

    registry: dict[str, str] = {}

    for key, body in _flavor_bodies().items():
        if key != "default":
            registry[f"taste-profile:flavor:{key}"] = _wrap("0 0 32 32", body)

    for key, body in _vibe_bodies().items():
        registry[f"session:vibe:{key}"] = _wrap("0 0 32 32", body)

    for level in ("low", "medium", "high", "any"):
        registry[f"session:abv:{level}"] = _wrap("0 0 32 32", _abv_body(level))

    for key, body in _journey_bodies().items():
        registry[f"journey:{key}"] = _wrap("0 0 36 36", body)

    for key, body in _marketing_bodies().items():
        registry[f"marketing:{key}"] = _wrap("0 0 200 160", body)

    return registry
