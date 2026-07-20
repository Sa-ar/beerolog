"""Why-line explanation module.

Deterministic switch on dominant score component (template fallback) plus
structured match facts for the details accordion and LLM grounding.
"""

from __future__ import annotations

from app.api_contracts import DominantComponent, SessionIntent, WhyFact, WhyLine
from app.services.match_engine import BeerCandidate, MatchResult, beer_flavor_strengths

# Cosine above this counts as "close to your taste profile" for fact bullets.
_TASTE_CLOSE_FLOOR = 0.25
# Minimum beer flavor strength to consider a family for overlap.
_FLAVOR_BEER_FLOOR = 0.45
# Minimum user preference to count a family as a like.
_FLAVOR_USER_FLOOR = 0.5


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


def _top_flavor_overlap(
    beer: BeerCandidate,
    user_flavor: dict[str, float] | None,
) -> str | None:
    if not user_flavor:
        return None
    strengths = beer_flavor_strengths(beer)
    best_family: str | None = None
    best_score = 0.0
    for family, user_strength in user_flavor.items():
        beer_strength = strengths.get(family, 0.0)
        if user_strength < _FLAVOR_USER_FLOOR or beer_strength < _FLAVOR_BEER_FLOOR:
            continue
        score = user_strength * beer_strength
        if score > best_score:
            best_score = score
            best_family = family
    return best_family


def build_match_facts(
    result: MatchResult,
    *,
    session: SessionIntent | None,
    user_flavor: dict[str, float] | None,
) -> list[WhyFact]:
    """Language-neutral facts for details UI and LLM grounding."""
    beer = result.beer
    facts: list[WhyFact] = []

    if result.baseline_cos >= _TASTE_CLOSE_FLOOR:
        facts.append(WhyFact(code="taste_close"))

    flavor = _top_flavor_overlap(beer, user_flavor)
    if flavor:
        facts.append(WhyFact(code="flavor_overlap", params={"flavor": flavor}))

    if session is not None:
        facts.append(WhyFact(code="session_vibe", params={"vibe": session.vibe.value}))

    if result.abv_fits_intent is True and session is not None:
        abv = session.abv_intent.value
        if abv != "any":
            facts.append(WhyFact(code="abv_fit", params={"abv": abv}))
    elif result.abv_fits_intent is True:
        facts.append(WhyFact(code="abv_fit_profile"))

    if result.novelty_score > 0.01:
        facts.append(WhyFact(code="novelty_boost"))
    elif result.novelty_score < -0.01:
        facts.append(WhyFact(code="novelty_safe"))

    return facts


def compose_why(
    result: MatchResult,
    *,
    session: SessionIntent | None,
    user_flavor: dict[str, float] | None,
    text: str | None = None,
) -> WhyLine:
    """Template why-line + facts, optionally overridden with LLM text."""
    base = explain(result.dominant_component, session=session)
    return WhyLine(
        code=base.code,
        params=base.params,
        text=text,
        facts=build_match_facts(result, session=session, user_flavor=user_flavor),
    )
