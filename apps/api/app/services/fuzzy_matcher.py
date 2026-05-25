from dataclasses import dataclass
from typing import Literal


@dataclass
class CatalogEntry:
    id: str
    name: str
    brewery: str


@dataclass
class MatchResult:
    entry: CatalogEntry
    score: float
    matched_on: Literal["exact", "fuzzy", "brewery+name"]


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


def _similarity(a: str, b: str) -> float:
    a, b = a.lower(), b.lower()
    if a == b:
        return 1.0
    max_len = max(len(a), len(b))
    if max_len == 0:
        return 1.0
    return 1.0 - _edit_distance(a, b) / max_len


def fuzzy_match(
    query: str,
    catalog: list[CatalogEntry],
    threshold: float = 0.6,
) -> list[MatchResult]:
    results = []
    for entry in catalog:
        name_score = _similarity(query, entry.name)
        brewery_name_score = _similarity(query, f"{entry.brewery} {entry.name}")
        score = max(name_score, brewery_name_score)
        matched_on: Literal["exact", "fuzzy", "brewery+name"] = (
            "exact"
            if name_score == 1.0
            else "brewery+name"
            if brewery_name_score > name_score
            else "fuzzy"
        )
        if score >= threshold:
            results.append(MatchResult(entry=entry, score=score, matched_on=matched_on))
    return sorted(results, key=lambda r: r.score, reverse=True)
