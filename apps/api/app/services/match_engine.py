"""Match engine: the two-stage ranker.

Stage 1 — weighted cosine merge of baseline and session embeddings
against each beer embedding.
Stage 2 — novelty re-rank scaled by NoveltyAffinity × beer.adventurousness.

Pure given the catalog. No I/O. The catalog is supplied as a list of
BeerCandidate dataclasses; production wires this to pgvector.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass

from app.api_contracts import DominantComponent


@dataclass(frozen=True)
class BeerCandidate:
    id: str
    name: str
    brewery: str
    style: str
    abv: float
    market_tier: str
    image_url: str | None
    adventurousness: float
    embedding: list[float]


@dataclass(frozen=True)
class MatchResult:
    beer: BeerCandidate
    baseline_score: float
    session_score: float
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


def rank(
    *,
    baseline_embedding: list[float],
    session_embedding: list[float] | None,
    novelty_affinity: float,
    catalog: Sequence[BeerCandidate],
    alpha: float,
    beta: float,
    top_k: int = 5,
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
        novelty_term = beta * (novelty_affinity - 0.5) * beer.adventurousness
        total = baseline_term + session_term + novelty_term

        # Dominant contributor by absolute magnitude
        components = {
            DominantComponent.baseline: baseline_term,
            DominantComponent.session: session_term,
        }
        if novelty_term > 0:
            components[DominantComponent.novelty_positive] = novelty_term
        elif novelty_term < 0:
            components[DominantComponent.novelty_negative] = -novelty_term

        dominant = max(components.items(), key=lambda kv: kv[1])[0]

        results.append(
            MatchResult(
                beer=beer,
                baseline_score=baseline_term,
                session_score=session_term,
                novelty_score=novelty_term,
                total_score=total,
                dominant_component=dominant,
            )
        )

    results.sort(key=lambda r: r.total_score, reverse=True)
    return results[:top_k]
