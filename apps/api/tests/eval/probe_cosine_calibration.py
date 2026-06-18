"""Cosine calibration probe — validates match_cos_floor / match_cos_ceiling.

Measures baseline×catalog cosine distribution across reference personas and
checks that configured anchors leave headroom for top matches without
compressing the median to zero.

Usage:
    uv --directory apps/api run python -m tests.eval.probe_cosine_calibration
"""

from __future__ import annotations

import asyncio
import statistics
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_ROOT / "apps" / "api"))

from app.api_contracts import OnboardingAnswers  # noqa: E402
from app.config import settings  # noqa: E402
from app.db import get_pool  # noqa: E402
from app.services import baseline_taste  # noqa: E402
from app.services.catalog_repo import fetch_catalog  # noqa: E402
from app.services.embedding_service import get_embedding_client  # noqa: E402
from app.services.match_engine import cosine, rank  # noqa: E402

REFERENCE_PERSONAS: list[tuple[str, OnboardingAnswers]] = [
    (
        "hop-head",
        OnboardingAnswers(
            coffee="black",
            water="strong",
            novelty_seeking=True,
            snack="dark_chocolate",
            sour_foods="okay",
            citrus="grapefruit",
            smoked_foods="okay",
        ),
    ),
    (
        "comfort-drinker",
        OnboardingAnswers(
            coffee="iced_sweet",
            water="still",
            novelty_seeking=False,
            snack="milk_chocolate",
            sour_foods="avoid",
            citrus="lemonade",
            smoked_foods="avoid",
        ),
    ),
]


def _calibrated(cos: float) -> float:
    floor = settings.match_cos_floor
    ceiling = settings.match_cos_ceiling
    if ceiling <= floor:
        return cos * 100
    return max(0.0, min(100.0, (cos - floor) / (ceiling - floor) * 100))


async def main() -> int:
    if not settings.openai_api_key:
        print("OPENAI_API_KEY not set; skipping calibration probe.")
        return 0
    if not settings.database_url:
        print("DATABASE_URL not set; skipping calibration probe.")
        return 0

    client = get_embedding_client()
    pool = await get_pool()
    catalog = await fetch_catalog(pool)
    all_scores: list[float] = []
    top_scores: list[float] = []

    for label, answers in REFERENCE_PERSONAS:
        vec = await client.embed(baseline_taste.compose_text(answers))
        scores = [cosine(vec, b.embedding) for b in catalog]
        all_scores.extend(scores)
        results = rank(
            baseline_embedding=vec,
            session_embedding=None,
            novelty_affinity=baseline_taste.compose_dials(answers).novelty_affinity,
            catalog=catalog,
            alpha=1.0,
            beta=0.0,
            top_k=1,
        )
        top = results[0].baseline_cos
        top_scores.append(top)
        print(f"{label}: top baseline_cos={top:.4f} calibrated={_calibrated(top):.0f}%")

    all_scores.sort()
    n = len(all_scores)
    p5 = all_scores[max(0, int(n * 0.05) - 1)]
    p95 = all_scores[int(n * 0.95)]
    max_top = max(top_scores)

    floor = settings.match_cos_floor
    ceiling = settings.match_cos_ceiling
    print()
    print(f"Catalog personas×beers: n={n} p5={p5:.4f} p95={p95:.4f}")
    print(f"Anchors: floor={floor} ceiling={ceiling}")
    print(f"Max top-1 across personas: {max_top:.4f} → {_calibrated(max_top):.0f}%")

    ok = True
    if floor > p5:
        print(f"WARN: floor {floor} > empirical p5 {p5:.4f}")
    if ceiling < max_top:
        print(f"FAIL: ceiling {ceiling} < max top match {max_top:.4f} — top picks clip at 100%")
        ok = False
    if _calibrated(max_top) < 65:
        print(f"WARN: top calibrated match {_calibrated(max_top):.0f}% < 65 — consider raising ceiling")
    if ok:
        print("PASS: anchors bracket the live distribution.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
