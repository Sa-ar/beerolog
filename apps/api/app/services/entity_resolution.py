"""Match a scraped product string to a catalog Beer (PRD: where-to-buy).

Pure + injectable: the caller supplies the product's embedding and the catalog
(id + embedding), so this module has no I/O. Normalize the name, take the best
cosine against the catalog, and classify by threshold: high → link, mid → queue
for human review, low / nothing → drop (we only recommend catalog beers).
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass

# Volume/unit noise common in IL catalogs: 500מל, 330ml, 0.5ל, 6-pack, פחית.
_NOISE = re.compile(
    r"\d+(\.\d+)?\s*(ml|l|cl|מל|ליטר|ל|cc)\b|\b\d+\s*-?\s*pack\b|\bפחית\b",
    re.IGNORECASE,
)
_PUNCT = re.compile(r"[\"'׳״.,()/_-]+")


# Used by a source adapter to clean a scraped product string BEFORE embedding it
# (the embedding step is I/O and lands with the concrete scraper). classify()
# itself works on the resulting vector, so it doesn't call this directly.
def normalize_name(name: str) -> str:
    s = name.lower()
    s = _NOISE.sub(" ", s)
    s = _PUNCT.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip()


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


@dataclass(frozen=True)
class Linked:
    beer_id: str
    score: float


@dataclass(frozen=True)
class NeedsReview:
    beer_id: str
    score: float


@dataclass(frozen=True)
class Dropped:
    score: float


Resolution = Linked | NeedsReview | Dropped


def classify(
    product_embedding: list[float],
    catalog: list[tuple[str, list[float]]],
    link_threshold: float = 0.92,
    review_threshold: float = 0.80,
) -> Resolution:
    best_id: str | None = None
    best_score = -1.0  # so an orthogonal (0.0) cosine still wins the slot
    for beer_id, emb in catalog:
        score = cosine(product_embedding, emb)
        if score > best_score:
            best_score, best_id = score, beer_id
    if best_id is None or best_score < review_threshold:
        return Dropped(score=best_score)
    if best_score >= link_threshold:
        return Linked(beer_id=best_id, score=best_score)
    return NeedsReview(beer_id=best_id, score=best_score)
