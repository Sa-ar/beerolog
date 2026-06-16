"""Hebrew retrieval probe (slice #79).

Measures top-5 hit rate of Hebrew queries against an English-keyed
catalog. Gate: Hebrew hit rate ≥ 70% of the English baseline. Below
the gate, recommend switching EMBEDDING_MODEL to multilingual-e5
large-instruct per the PRD.

This script is runnable against the production embedding service. The
20 translated descriptions are HITL — a Hebrew speaker should review
them before locking the probe results.

Usage:
    OPENAI_API_KEY=... python -m apps.api.tests.eval.probe_hebrew
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_ROOT / "apps" / "api"))

from app.config import settings  # noqa: E402
from app.services.embedding_service import get_embedding_client  # noqa: E402
from app.services.match_engine import cosine  # noqa: E402

# (English description, Hebrew description) — HITL: Hebrew speaker review.
PAIRS: list[tuple[str, str]] = [
    (
        "American IPA from Alexander Brewery, Israel. 6.2% ABV, IBU 65. Hops: Citra, Mosaic, Centennial. Citrus and pine forward, dry finish, medium-light body.",
        "אייפיאיי אמריקאית מבירת הבירה אלכסנדר, ישראל. 6.2% אלכוהול, יחידות מרירות 65. כשות: סיטרה, מוזאיק, סנטניאל. הדר הדרים וציתרוס, סיום יבש, גוף קל-בינוני.",
    ),
    # HITL: add 19 more pairs covering the catalog's market tiers and styles.
]


async def main() -> int:
    if not settings.openai_api_key:
        print("OPENAI_API_KEY not set; cannot run live probe.")
        return 2
    client = get_embedding_client()

    en_vecs = [await client.embed(en) for en, _ in PAIRS]
    he_vecs = [await client.embed(he) for _, he in PAIRS]

    # For each Hebrew query, rank against all English vectors and record
    # the rank of the true pair.
    en_baseline_hits = 0
    he_query_hits = 0
    for i in range(len(PAIRS)):
        # English-baseline: query English[i] against English catalog. Always hit (trivially 1).
        en_baseline_hits += 1
        # Hebrew query: rank against English catalog
        scores = [(j, cosine(he_vecs[i], en_vecs[j])) for j in range(len(PAIRS))]
        scores.sort(key=lambda kv: kv[1], reverse=True)
        top5 = [j for j, _ in scores[:5]]
        if i in top5:
            he_query_hits += 1
    if en_baseline_hits == 0:
        print("No pairs to evaluate.")
        return 2
    ratio = he_query_hits / en_baseline_hits
    print(f"Hebrew hit rate: {he_query_hits}/{en_baseline_hits} = {ratio:.2%}")
    print(f"Gate: ≥ 70% of English baseline. {'PASS' if ratio >= 0.7 else 'FAIL'}")
    if ratio < 0.7:
        print("\nRecommended remediation: switch EMBEDDING_MODEL to")
        print("  multilingual-e5-large-instruct (per PRD §Configuration knobs)")
        print("and re-seed the catalog.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
