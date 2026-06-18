"""Shared BaselineTaste dial → synthetic preference text.

Used when re-embedding dials (recommendations fallback, PATCH baseline).
Includes numeric flavor weights to preserve more signal than top-3 names alone.
"""

from __future__ import annotations

from app.api_contracts import BaselineTasteDials
from app.services.baseline_sensory_bridge import compose_baseline_sensory_bridge


def dials_to_text(dials: BaselineTasteDials) -> str:
    sensory = compose_baseline_sensory_bridge(dials)
    family_sorted = sorted(dials.flavor_family.items(), key=lambda kv: kv[1], reverse=True)
    flavor_detail = ", ".join(f"{name} ({score:.2f})" for name, score in family_sorted)
    bitterness_word = (
        "high" if dials.bitterness > 0.6 else "moderate" if dials.bitterness > 0.35 else "low"
    )
    bubbles_word = (
        "strongly carbonated"
        if dials.bubbles > 0.65
        else "moderately carbonated"
        if dials.bubbles > 0.35
        else "lightly carbonated"
    )
    return (
        f"User taste profile. {sensory} "
        f"Prefers {bubbles_word} drinks. Tolerates {bitterness_word} bitterness. "
        f"Flavor draw weights: {flavor_detail}."
    )
