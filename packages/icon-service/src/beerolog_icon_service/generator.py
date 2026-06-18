from __future__ import annotations

from beerolog_icon_service.taste_profile import (
    FLAVOR_ACCENTS,
    ICON_STYLE_FILL_LIGHT,
    ICON_STYLE_FILL_MID,
    ICON_STYLE_STROKE,
    ICON_STYLE_STROKE_WIDTH,
    VIBE_ACCENTS,
)
from beerolog_icon_service.validate import InvalidSvgError, validate_svg

_SYSTEM_PROMPT = f"""You generate a single inline SVG icon for Beerolog, a beer taste app.

Requirements:
- Output ONLY raw SVG markup, no markdown fences or explanation.
- Root element: <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
- Bold filled shapes with stroke-width {ICON_STYLE_STROKE_WIDTH}; must read clearly at 16px.
- Outline stroke: {ICON_STYLE_STROKE}
- Neutral fills: {ICON_STYLE_FILL_LIGHT}, {ICON_STYLE_FILL_MID}
- Use one obvious real-world symbol (e.g. lemon wedge for sour, hop cone for hoppy, wheat for malty).
- Large simple silhouettes; no fine detail, gradients, or opacity below 0.4.
- Semantic accent fills when helpful: sour {FLAVOR_ACCENTS["sour"]}, hoppy {FLAVOR_ACCENTS["hoppy"]}, malty {FLAVOR_ACCENTS["malty"]}, roasty {FLAVOR_ACCENTS["roasty"]}, fruity {FLAVOR_ACCENTS["fruity"]}, smoky {FLAVOR_ACCENTS["smoky"]}.
- Session vibe accents: refreshing {VIBE_ACCENTS["refreshing"]}, cozy {VIBE_ACCENTS["cozy"]}, adventurous {VIBE_ACCENTS["adventurous"]}, familiar {VIBE_ACCENTS["familiar"]}.
- No script tags, no event handlers, no external image references, no text labels.
"""


class GPTIconGenerator:
    def __init__(self, *, api_key: str, model: str) -> None:
        from openai import AsyncOpenAI  # type: ignore[import-not-found]

        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model

    async def generate_svg(self, description: str) -> str:
        last_error: Exception | None = None
        for _attempt in range(2):
            try:
                response = await self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": (
                                f"{description}\n\n"
                                "Draw ONE iconic object centered in the frame. "
                                "Prefer filled shapes over thin outlines."
                            ),
                        },
                    ],
                    temperature=0.3,
                )
                raw = (response.choices[0].message.content or "").strip()
                if raw.startswith("```"):
                    raw = raw.strip("`")
                    if raw.lower().startswith("svg"):
                        raw = raw[3:].strip()
                return validate_svg(raw)
            except (InvalidSvgError, ValueError, IndexError) as exc:
                last_error = exc
        raise InvalidSvgError(f"Failed to generate valid SVG: {last_error}")
