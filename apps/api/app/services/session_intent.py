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
        f"{_ABV_PHRASE[intent.abv_intent].capitalize()}.",
    ]
    if intent.free_text.strip():
        parts.append(f"More context: {intent.free_text.strip()}")
    return " ".join(parts)
