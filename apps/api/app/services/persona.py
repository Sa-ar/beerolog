"""Taste persona generator.

Produces a short, playful bilingual (en + he) persona — title + blurb — from a
user's taste dials. Cosmetic only: never an input to matching (ADR-0005).
The generator is dependency-injected so tests substitute a deterministic stub,
the same way the embedding and icon clients are wired.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Protocol

from app.api_contracts import BaselineTasteDials


@dataclass(frozen=True)
class Persona:
    title_en: str
    blurb_en: str
    title_he: str
    blurb_he: str


class PersonaGenerator(Protocol):
    async def generate(self, *, dials: BaselineTasteDials) -> Persona: ...


_SYSTEM_PROMPT = (
    "You name a person's beer taste persona. Given numeric taste dials (0..1), "
    "return STRICT JSON with exactly these keys: title_en, blurb_en, title_he, "
    "blurb_he. The title is 1-3 words, fun and evocative (e.g. 'Hop Hunter', "
    "'Malt Comfort-Seeker'). The blurb is one warm sentence. title_he/blurb_he "
    "are natural Hebrew (not transliteration). No beer-snob jargon. JSON only."
)


def _describe(dials: BaselineTasteDials) -> str:
    families = ", ".join(f"{k} {v:.2f}" for k, v in dials.flavor_family.items())
    return (
        f"bitterness {dials.bitterness:.2f}, sweetness {dials.sweetness:.2f}, "
        f"body {dials.body:.2f}, bubbles {dials.bubbles:.2f}, "
        f"abv_affinity {dials.abv_affinity:.2f}, novelty {dials.novelty_affinity:.2f}; "
        f"flavor families: {families}."
    )


class GPTPersonaGenerator:
    def __init__(self, *, api_key: str, model: str) -> None:
        from app.services.observability import observed_async_openai

        self._client = observed_async_openai(api_key)
        self._model = model

    async def generate(self, *, dials: BaselineTasteDials) -> Persona:
        resp = await self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": _describe(dials)},
            ],
            response_format={"type": "json_object"},
        )
        data = json.loads(resp.choices[0].message.content or "{}")
        return Persona(
            title_en=str(data["title_en"]),
            blurb_en=str(data["blurb_en"]),
            title_he=str(data["title_he"]),
            blurb_he=str(data["blurb_he"]),
        )
