"""SessionIntent composer.

Maps a session quick-pick + optional free text to a synthetic intent
string that gets embedded as the session-side query vector.

Pure functions. No I/O.
"""

from __future__ import annotations

from app.api_contracts import AbvIntent, SessionIntent, Vibe

_VIBE_PHRASE = {
    Vibe.refreshing: "wants something refreshing and easy-drinking",
    Vibe.cozy: "wants something cozy, warming, and rich",
    Vibe.adventurous: "wants to try something adventurous and intense",
    Vibe.familiar: "wants something familiar and comforting",
}

_VIBE_STYLE_ANCHOR = {
    Vibe.refreshing: (
        "Tonight lean toward crisp lagers, pilsners, wheat beers, kölsch, "
        "and light sours with bright carbonation"
    ),
    Vibe.cozy: (
        "Tonight lean toward stouts, porters, brown ales, barleywines, "
        "and warming malty beers with depth"
    ),
    Vibe.adventurous: (
        "Tonight lean toward barrel-aged beers, mixed-fermentation, imperial styles, "
        "sours, and unusual limited releases"
    ),
    Vibe.familiar: (
        "Tonight lean toward mainstream lagers, classic pale ales, well-known imports, "
        "and approachable crowd-pleasers"
    ),
}

_ABV_PHRASE = {
    AbvIntent.low: "prefers a low-alcohol session beer (4.5% or under)",
    AbvIntent.medium: "is happy with a medium-strength beer (4.5% to 6.5%)",
    AbvIntent.high: "wants a stronger beer (6.5% and up)",
    AbvIntent.any: "is open to any alcohol level",
}


def compose_text(intent: SessionIntent) -> str:
    parts = [
        "Drinking right now.",
        f"Tonight the drinker {_VIBE_PHRASE[intent.vibe]}.",
        _VIBE_STYLE_ANCHOR[intent.vibe] + ".",
        f"{_ABV_PHRASE[intent.abv_intent].capitalize()}.",
    ]
    if intent.free_text.strip():
        parts.append(f"More context: {intent.free_text.strip()}")
    return " ".join(parts)
