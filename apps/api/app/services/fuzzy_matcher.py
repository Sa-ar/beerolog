"""Fuzzy beer-name matching for menu scan.

Scores exact / near-exact names, brewery+name combos, and board shorthand
(e.g. "Salted Caramel" → "Porter & Sons Salted Caramel") via token containment.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class CatalogEntry:
    id: str
    name: str
    brewery: str


@dataclass(frozen=True)
class MatchResult:
    entry: CatalogEntry
    score: float
    matched_on: Literal["exact", "fuzzy", "brewery+name", "containment"]


def _edit_distance(a: str, b: str) -> int:
    """Standard Levenshtein distance."""
    m, n = len(a), len(b)
    dp = list(range(n + 1))
    for i in range(1, m + 1):
        prev, dp[0] = dp[0], i
        for j in range(1, n + 1):
            temp = dp[j]
            if a[i - 1] == b[j - 1]:
                dp[j] = prev
            else:
                dp[j] = 1 + min(prev, dp[j], dp[j - 1])
            prev = temp
    return dp[n]


def _normalize(text: str) -> str:
    """Lowercase, expand &, drop punctuation, collapse repeated tokens."""
    s = text.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9\s]+", " ", s)
    tokens = s.split()
    collapsed: list[str] = []
    for t in tokens:
        if not collapsed or collapsed[-1] != t:
            collapsed.append(t)
    return " ".join(collapsed)


def _tokens(text: str) -> list[str]:
    return _normalize(text).split()


def _similarity(a: str, b: str) -> float:
    a_n, b_n = _normalize(a), _normalize(b)
    if a_n == b_n:
        return 1.0
    max_len = max(len(a_n), len(b_n))
    if max_len == 0:
        return 1.0
    return 1.0 - _edit_distance(a_n, b_n) / max_len


def _containment_score(query: str, name: str) -> float:
    """High score when the query is a distinctive subset of the catalog name.

    Board lines often omit the brewery series prefix ("Salted Caramel" for
    "Porter & Sons Salted Caramel") or OCR drops/duplicates words.
    """
    q = _tokens(query)
    n = _tokens(name)
    if not q or not n:
        return 0.0
    q_set, n_set = set(q), set(n)
    # Ignore ultra-generic single tokens that would false-positive.
    if len(q_set) == 1 and next(iter(q_set)) in {"ipa", "ale", "lager", "stout", "sour", "beer"}:
        return 0.0
    if q_set <= n_set:
        # Full query covered by name — strong match, slight penalty if name is much longer.
        coverage = len(q_set) / len(n_set)
        return min(1.0, 0.88 + 0.12 * coverage)
    overlap = len(q_set & n_set) / len(q_set)
    if overlap >= 0.75 and len(q_set & n_set) >= 2:
        return 0.7 + 0.2 * overlap
    return 0.0


def fuzzy_match(
    query: str,
    catalog: list[CatalogEntry],
    threshold: float = 0.6,
) -> list[MatchResult]:
    results: list[MatchResult] = []
    for entry in catalog:
        name_score = _similarity(query, entry.name)
        brewery_name_score = _similarity(query, f"{entry.brewery} {entry.name}")
        contain_score = max(
            _containment_score(query, entry.name),
            _containment_score(query, f"{entry.brewery} {entry.name}"),
        )
        score = max(name_score, brewery_name_score, contain_score)
        if name_score == 1.0:
            matched_on: Literal["exact", "fuzzy", "brewery+name", "containment"] = "exact"
        elif brewery_name_score >= name_score and brewery_name_score >= contain_score:
            matched_on = "brewery+name"
        elif contain_score >= name_score:
            matched_on = "containment"
        else:
            matched_on = "fuzzy"
        if score >= threshold:
            results.append(MatchResult(entry=entry, score=score, matched_on=matched_on))
    return sorted(results, key=lambda r: r.score, reverse=True)
