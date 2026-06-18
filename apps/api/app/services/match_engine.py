"""Match engine: the two-stage ranker.

Stage 1 — weighted cosine merge of baseline and session embeddings
against each beer embedding.
Stage 2 — novelty re-rank scaled by NoveltyAffinity × beer.adventurousness.
Stage 3 — ABV band bonus/penalty when session abv_intent is set.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

from app.api_contracts import AbvIntent, DominantComponent


@dataclass(frozen=True)
class BeerCandidate:
    id: str
    name: str
    brewery: str
    style: str
    abv: float
    market_tier: str
    color: str
    image_url: str | None
    adventurousness: float
    embedding: list[float]


@dataclass(frozen=True)
class MatchResult:
    beer: BeerCandidate
    baseline_cos: float
    session_cos: float
    baseline_score: float
    session_score: float
    abv_score: float
    abv_fits_intent: bool | None
    novelty_score: float
    total_score: float
    dominant_component: DominantComponent


def cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0
    for x, y in zip(a, b):
        dot += x * y
        norm_a += x * x
        norm_b += y * y
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (math.sqrt(norm_a) * math.sqrt(norm_b))


def abv_in_band(abv: float, intent: AbvIntent) -> bool:
    if intent == AbvIntent.low:
        return abv <= 4.5
    if intent == AbvIntent.medium:
        return 4.5 < abv <= 6.5
    if intent == AbvIntent.high:
        return abv > 6.5
    return True


def abv_term_for_beer(abv: float, intent: AbvIntent | None, weight: float) -> float:
    if intent is None or intent == AbvIntent.any or weight == 0.0:
        return 0.0
    return weight if abv_in_band(abv, intent) else -weight


def abv_fits_intent_for_beer(abv: float, intent: AbvIntent | None, weight: float) -> bool | None:
    if intent is None or intent == AbvIntent.any or weight == 0.0:
        return None
    return abv_in_band(abv, intent)


def rank(
    *,
    baseline_embedding: list[float],
    session_embedding: list[float] | None,
    novelty_affinity: float,
    catalog: Sequence[BeerCandidate],
    alpha: float,
    beta: float,
    top_k: int = 5,
    abv_intent: AbvIntent | None = None,
    abv_weight: float = 0.0,
) -> list[MatchResult]:
    """Rank candidates.

    When session_embedding is None, baseline carries the full weight — the
    skip-session-intent path from the PRD.
    """

    effective_alpha = 1.0 if session_embedding is None else alpha
    results: list[MatchResult] = []

    for beer in catalog:
        baseline_cos = cosine(baseline_embedding, beer.embedding)
        session_cos = cosine(session_embedding, beer.embedding) if session_embedding else 0.0

        baseline_term = effective_alpha * baseline_cos
        session_term = (1.0 - effective_alpha) * session_cos
        abv_term = abv_term_for_beer(beer.abv, abv_intent, abv_weight)
        abv_fits = abv_fits_intent_for_beer(beer.abv, abv_intent, abv_weight)
        novelty_term = beta * (novelty_affinity - 0.5) * beer.adventurousness
        total = baseline_term + session_term + abv_term + novelty_term

        components = {
            DominantComponent.baseline: baseline_term,
            DominantComponent.session: session_term,
            DominantComponent.abv: abs(abv_term),
        }
        if novelty_term > 0:
            components[DominantComponent.novelty_positive] = novelty_term
        elif novelty_term < 0:
            components[DominantComponent.novelty_negative] = -novelty_term

        dominant = max(components.items(), key=lambda kv: kv[1])[0]

        results.append(
            MatchResult(
                beer=beer,
                baseline_cos=baseline_cos,
                session_cos=session_cos,
                baseline_score=baseline_term,
                session_score=session_term,
                abv_score=abv_term,
                abv_fits_intent=abv_fits,
                novelty_score=novelty_term,
                total_score=total,
                dominant_component=dominant,
            )
        )

    results.sort(key=lambda r: r.total_score, reverse=True)
    return results[:top_k]
