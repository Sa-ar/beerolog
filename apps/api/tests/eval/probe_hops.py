"""Hop-semantics probe (slice #79).

Measures whether hop NAMES carry semantic signal in the embedding
model. Compares mean cosine of (hop name, descriptor) pairs against a
random-pair baseline. If hop names do not cluster meaningfully, the
seed pipeline must include explicit descriptor expansion alongside
hop names in the composed embedding text (PRD §Testing Decisions).

Usage:
    OPENAI_API_KEY=... python -m apps.api.tests.eval.probe_hops
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

HOP_DESCRIPTOR_PAIRS: list[tuple[str, str]] = [
    ("Citra", "tropical citrus grapefruit passionfruit mango"),
    ("Mosaic", "stone fruit mango blueberry tangerine earthy"),
    ("Saaz", "noble herbal earthy spicy mild"),
    ("Cascade", "grapefruit citrus floral pine American hop"),
    ("Centennial", "floral citrus grapefruit clean bitter"),
    ("Simcoe", "piney resinous passionfruit dank earthy"),
    ("Galaxy", "passionfruit citrus peach Australian hop"),
    ("Amarillo", "orange floral lemon citrus medium hop"),
    ("Hallertau", "noble herbal mild grassy German hop"),
    ("Magnum", "clean bitter neutral high alpha bittering hop"),
    ("Fuggle", "earthy English mild herbal traditional"),
    ("Nelson Sauvin", "white wine gooseberry tropical New Zealand"),
    ("Sorachi Ace", "lemon dill cilantro Japanese unique"),
    ("Chinook", "piney spicy grapefruit American bittering"),
    ("Idaho 7", "tropical pine berry American hop"),
    ("Strata", "strawberry passionfruit dank cannabis-like"),
    ("Sabro", "coconut tropical melon stone fruit"),
    ("Riwaka", "grapefruit lime citrus New Zealand"),
    ("Tettnang", "floral noble mild herbal German"),
    ("East Kent Goldings", "earthy floral honey English noble"),
]


async def main() -> int:
    if not settings.openai_api_key:
        print("OPENAI_API_KEY not set; cannot run live probe.")
        return 2
    client = get_embedding_client()

    pair_scores: list[float] = []
    hop_vecs: list[list[float]] = []
    desc_vecs: list[list[float]] = []
    for hop, desc in HOP_DESCRIPTOR_PAIRS:
        hv = await client.embed(hop)
        dv = await client.embed(desc)
        hop_vecs.append(hv)
        desc_vecs.append(dv)
        pair_scores.append(cosine(hv, dv))

    # Random-pair baseline: each hop vs. every OTHER descriptor.
    random_scores: list[float] = []
    for i in range(len(HOP_DESCRIPTOR_PAIRS)):
        for j in range(len(HOP_DESCRIPTOR_PAIRS)):
            if i != j:
                random_scores.append(cosine(hop_vecs[i], desc_vecs[j]))

    pair_mean = sum(pair_scores) / len(pair_scores)
    random_mean = sum(random_scores) / len(random_scores)
    gap = pair_mean - random_mean
    print(f"True-pair mean cosine:   {pair_mean:.4f}")
    print(f"Random-pair mean cosine: {random_mean:.4f}")
    print(f"Gap:                     {gap:+.4f}")
    print(f"Gate: gap ≥ 0.15.  {'PASS' if gap >= 0.15 else 'FAIL'}")
    if gap < 0.15:
        print("\nRecommended remediation: extend packages/db/scripts/seed_catalog/compose_text.ts")
        print(
            "to spell out hop descriptors alongside names (e.g. 'Citra (tropical, citrus, grapefruit)')."
        )
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
