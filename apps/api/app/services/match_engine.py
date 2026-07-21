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
    name_hebrew: str | None = None
    ibu: int | None = None


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
    avoid_score: float
    total_score: float
    dominant_component: DominantComponent


# Color -> darkness/roastiness proxy. Shared by the dial-space matcher and the
# avoid-penalty below so both read a beer's flavor the same way.
COLOR_DARKNESS = {"pale": 0.1, "gold": 0.2, "amber": 0.45, "brown": 0.7, "dark": 0.9}


def beer_flavor_strengths(beer: BeerCandidate) -> dict[str, float]:
    """Project a beer into flavor-family strengths in [0, 1] from style keywords
    and color. Single source of truth for both dial_match and the avoid-penalty.
    """
    style = beer.style.lower()
    darkness = COLOR_DARKNESS.get(beer.color, 0.4)

    def has(*words: str) -> bool:
        return any(w in style for w in words)

    hoppy = 0.85 if has("ipa") else 0.6 if has("pale ale") else 0.3
    # Roasted/coffee-forward: explicit coffee styles rank highest, then stout/porter.
    roasty = (
        0.9
        if has("coffee", "espresso", "mocha", "imperial stout")
        else 0.85
        if has("stout", "porter")
        else max(0.2, darkness * 0.6)
    )
    malty = 0.75 if has("amber", "bock", "brown", "stout", "porter", "lager") else 0.45
    fruity = 0.8 if has("ipa", "pale ale", "saison", "wit", "weizen", "hefe") else 0.25
    sour = 0.85 if has("gose", "sour", "lambic", "berliner") else 0.1
    smoky = 0.8 if has("smoke", "rauch") else 0.05
    return {
        "fruity": fruity,
        "hoppy": hoppy,
        "malty": malty,
        "roasty": roasty,
        "smoky": smoky,
        "sour": sour,
    }


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
    user_flavor: dict[str, float] | None = None,
    avoid_weight: float = 0.0,
    avoid_neutral: float = 0.35,
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

        # Graded avoid-penalty: for each flavor family the user rates BELOW
        # neutral, subtract in proportion to how far below x how strong the beer
        # is in that family. Soft down-rank (never a hard exclusion), scaled by
        # dislike intensity. See docs/quiz-roasted-dislike-research.md.
        avoid_term = 0.0
        if user_flavor and avoid_weight:
            strengths = beer_flavor_strengths(beer)
            deficit_sum = sum(
                max(0.0, avoid_neutral - user_strength) * strengths.get(family, 0.0)
                for family, user_strength in user_flavor.items()
            )
            avoid_term = avoid_weight * deficit_sum

        total = baseline_term + session_term + abv_term + novelty_term - avoid_term

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
                avoid_score=avoid_term,
                total_score=total,
                dominant_component=dominant,
            )
        )

    results.sort(key=lambda r: r.total_score, reverse=True)
    return results[:top_k]
