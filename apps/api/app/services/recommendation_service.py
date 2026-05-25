"""Hybrid recommendation: cosine scoring on 7-dim vectors + LLM explanation."""

import math

from app.models.flavor import FLAVOR_VECTOR_DIMENSIONS, FlavorVector


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=True))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def _adventure_penalty(beer_vector: list[float], centroid: list[float]) -> float:
    """Distance of a beer from the centroid of common styles."""
    return _cosine_similarity(beer_vector, centroid)


def score_beers(
    taste_vector: FlavorVector,
    beers: list[dict],  # {id, name, flavor_vector: list[float], ...}
    adventure_boost: float = 0.0,  # -1 to +1; negative penalises outliers
) -> list[dict]:
    """Return beers sorted by match score descending."""
    taste = taste_vector.to_list()

    # Centroid of submitted beers (rough proxy for "common")
    centroid = [
        sum(b["flavor_vector"][i] for b in beers) / len(beers)
        for i in range(len(FLAVOR_VECTOR_DIMENSIONS))
    ]

    scored = []
    for beer in beers:
        bv = beer["flavor_vector"]
        base_score = _cosine_similarity(taste, bv)
        outlier_score = 1.0 - _adventure_penalty(bv, centroid)
        # Adventure modulates: positive boosts outliers, negative suppresses them.
        final_score = base_score + adventure_boost * outlier_score * 0.3
        scored.append({**beer, "score": final_score})

    return sorted(scored, key=lambda x: x["score"], reverse=True)


def aggregate_group_vectors(vectors: list[FlavorVector]) -> tuple[FlavorVector, bool]:
    """Merge participant vectors. Returns (aggregate, high_variance)."""
    if not vectors:
        return FlavorVector.neutral(), False

    dims = FLAVOR_VECTOR_DIMENSIONS
    means = [sum(v.to_list()[i] for v in vectors) / len(vectors) for i in range(len(dims))]

    variances = [
        sum((v.to_list()[i] - means[i]) ** 2 for v in vectors) / len(vectors)
        for i in range(len(dims))
    ]
    high_variance = any(var > 0.08 for var in variances)  # threshold: std > ~0.28

    return FlavorVector.from_list(means), high_variance
