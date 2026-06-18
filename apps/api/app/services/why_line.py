"""Why-line explanation module.

Deterministic switch on dominant score component. Returns a language-neutral
code + params; the frontend renders the localized sentence (key why.<code>).
Pure function. Trivial by design.
"""

from __future__ import annotations

from app.api_contracts import DominantComponent, SessionIntent, WhyLine


def explain(
    dominant: DominantComponent,
    *,
    session: SessionIntent | None,
) -> WhyLine:
    vibe_word = session.vibe.value if session else None
    abv_word = session.abv_intent.value if session else None

    if dominant == DominantComponent.baseline:
        if vibe_word:
            return WhyLine(code="baseline_vibe", params={"vibe": vibe_word})
        return WhyLine(code="baseline")
    if dominant == DominantComponent.session:
        if vibe_word:
            return WhyLine(code="session_vibe", params={"vibe": vibe_word})
        return WhyLine(code="session")
    if dominant == DominantComponent.abv:
        if abv_word and abv_word != "any":
            return WhyLine(code="abv", params={"abv": abv_word})
        return WhyLine(code="abv_any")
    if dominant == DominantComponent.novelty_positive:
        return WhyLine(code="novelty_positive")
    return WhyLine(code="novelty_negative")
