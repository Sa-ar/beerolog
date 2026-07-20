"""Batched LLM why-line generator for recommendation results.

One call covers the whole top-K. Grounded on structured match facts so the
model paraphrases rather than invents. Dependency-injected for tests.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Literal, Protocol

from app.api_contracts import WhyFact
from app.config import Settings, settings

_log = logging.getLogger(__name__)

WhyLocale = Literal["en", "he"]

_SYSTEM_PROMPT = (
    "You write short beer recommendation reasons. "
    "Given a list of beers each with display fields and structured match facts, "
    'return STRICT JSON: {"items": [{"id": string, "why": string}, ...]}. '
    "Write exactly one confident sentence per beer (max ~20 words / ~120 characters). "
    "Tone: social and sure — like 'This is a strong pick for you', not hedging. "
    "CRITICAL: every why sentence MUST be unique and name something specific to THAT beer "
    "(its name, brewery, style, or ABV) plus why it fits — never reuse the same wording "
    "or sentence skeleton across beers. "
    "Use ONLY the provided facts and beer fields; do not invent flavors, ingredients, "
    "or attributes that are not listed. "
    "Write every why sentence in the requested language only. "
    "JSON only — no markdown."
)


@dataclass(frozen=True)
class WhyBeerInput:
    id: str
    name: str
    brewery: str
    style: str
    abv: float
    market_tier: str
    facts: list[WhyFact]


class WhyExplainer(Protocol):
    async def explain_batch(
        self,
        beers: list[WhyBeerInput],
        *,
        locale: WhyLocale,
    ) -> dict[str, str | None]: ...


def _facts_for_prompt(facts: list[WhyFact]) -> list[dict[str, object]]:
    return [{"code": f.code, "params": f.params} for f in facts]


class GPTWhyExplainer:
    """Real OpenAI batch explainer."""

    def __init__(self, *, api_key: str, model: str, timeout_seconds: float) -> None:
        from openai import AsyncOpenAI  # type: ignore[import-not-found]

        self._client = AsyncOpenAI(api_key=api_key)
        self._model = model
        self._timeout = timeout_seconds

    async def explain_batch(
        self,
        beers: list[WhyBeerInput],
        *,
        locale: WhyLocale,
    ) -> dict[str, str | None]:
        if not beers:
            return {}

        payload = {
            "language": locale,
            "beers": [
                {
                    "id": b.id,
                    "name": b.name,
                    "brewery": b.brewery,
                    "style": b.style,
                    "abv": b.abv,
                    "market_tier": b.market_tier,
                    "facts": _facts_for_prompt(b.facts),
                }
                for b in beers
            ],
        }

        try:
            resp = await asyncio.wait_for(
                self._client.chat.completions.create(
                    model=self._model,
                    messages=[
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {
                            "role": "user",
                            "content": json.dumps(payload, ensure_ascii=False),
                        },
                    ],
                    response_format={"type": "json_object"},
                    max_tokens=80 * max(1, len(beers)),
                ),
                timeout=self._timeout,
            )
        except Exception as exc:
            _log.warning("why_explainer: LLM call failed (%s); falling back", exc)
            return {b.id: None for b in beers}

        out: dict[str, str | None] = {b.id: None for b in beers}
        try:
            raw = resp.choices[0].message.content or "{}"
            data = json.loads(raw)
            items = data.get("items") if isinstance(data, dict) else None
            if not isinstance(items, list):
                # Also accept a bare list root if the model ignores the wrapper.
                items = data if isinstance(data, list) else []
            for item in items:
                if not isinstance(item, dict):
                    continue
                beer_id = item.get("id")
                why = item.get("why")
                if isinstance(beer_id, str) and beer_id in out and isinstance(why, str):
                    cleaned = why.strip()
                    if cleaned:
                        out[beer_id] = cleaned[:200]
        except (ValueError, TypeError, AttributeError) as exc:
            _log.warning("why_explainer: unparseable LLM response (%s); falling back", exc)

        return out


class NullWhyExplainer:
    """No-op explainer used when OpenAI is unavailable in tests / deps."""

    async def explain_batch(
        self,
        beers: list[WhyBeerInput],
        *,
        locale: WhyLocale,
    ) -> dict[str, str | None]:
        return {b.id: None for b in beers}


def get_why_explainer(cfg: Settings | None = None) -> WhyExplainer:
    cfg = cfg or settings
    if not cfg.openai_api_key:
        return NullWhyExplainer()
    return GPTWhyExplainer(
        api_key=cfg.openai_api_key,
        model=cfg.why_model,
        timeout_seconds=cfg.why_timeout_seconds,
    )
