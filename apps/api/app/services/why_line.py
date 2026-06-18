"""Why-line explanation module.

Deterministic switch on dominant score component. One template per case.
Pure function. Trivial by design.
"""

from __future__ import annotations

from app.api_contracts import DominantComponent, SessionIntent


def explain(
    dominant: DominantComponent,
    *,
    session: SessionIntent | None,
) -> str:
    vibe_word = session.vibe.value if session else None
    abv_word = session.abv_intent.value if session else None

    if dominant == DominantComponent.baseline:
        if vibe_word:
            return f"Matches your usual style + tonight's {vibe_word} vibe."
        return "Matches your usual style."
    if dominant == DominantComponent.session:
        if vibe_word:
            return f"Tonight's {vibe_word} vibe pulled this one in."
        return "Tonight's mood pulled this one in."
    if dominant == DominantComponent.abv:
        if abv_word and abv_word != "any":
            return f"Fits your {abv_word}-ABV pick for tonight."
        return "Matches your alcohol preference for tonight."
    if dominant == DominantComponent.novelty_positive:
        return "A bolder pick than usual — you said you wanted to explore."
    return "A safe familiar choice — close to what you normally like."
