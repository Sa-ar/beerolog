"""Session overlap validation (post session-differentiation tuning).

Reports pairwise top-5 overlap and dominant-component distribution across
all vibe×ABV session combinations for a neutral baseline profile.

Usage:
    uv --directory apps/api run python -m tests.eval.session_overlap
"""

from __future__ import annotations

import asyncio
import sys
from collections import Counter
from itertools import product
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_ROOT / "apps" / "api"))

from app.api_contracts import (  # noqa: E402
    AbvIntent,
    BaselineTasteDials,
    RecommendationsRequest,
    SessionIntent,
    Vibe,
)
from app.config import settings  # noqa: E402
from app.db import get_pool  # noqa: E402
from app.routes.recommendations import _resolve_alpha  # noqa: E402
from app.services import session_intent  # noqa: E402
from app.services.baseline_dials_text import dials_to_text  # noqa: E402
from app.services.catalog_repo import fetch_catalog  # noqa: E402
from app.services.embedding_service import get_embedding_client  # noqa: E402
from app.services.match_engine import rank  # noqa: E402


NEUTRAL_DIALS = BaselineTasteDials(
    bubbles=0.5,
    bitterness=0.45,
    flavor_family={
        "malty": 0.7,
        "hoppy": 0.3,
        "roasty": 0.3,
        "fruity": 0.3,
        "sour": 0.5,
        "smoky": 0.5,
    },
    novelty_affinity=0.15,
)


async def main() -> int:
    if not settings.openai_api_key:
        print("OPENAI_API_KEY not set; skipping live overlap validation.")
        return 0
    if not settings.database_url:
        print("DATABASE_URL not set; skipping live overlap validation.")
        return 0

    client = get_embedding_client()
    baseline_vec = await client.embed(dials_to_text(NEUTRAL_DIALS))
    pool = await get_pool()
    catalog = await fetch_catalog(pool)
    alpha = _resolve_alpha(
        RecommendationsRequest(baseline=NEUTRAL_DIALS, session=SessionIntent(vibe=Vibe.refreshing, abv_intent=AbvIntent.low))
    )

    all_sets: list[set[str]] = []
    dom = Counter()
    for vibe, abv in product(Vibe, AbvIntent):
        sess = SessionIntent(vibe=vibe, abv_intent=abv)
        svec = await client.embed(session_intent.compose_text(sess))
        results = rank(
            baseline_embedding=baseline_vec,
            session_embedding=svec,
            novelty_affinity=NEUTRAL_DIALS.novelty_affinity,
            catalog=catalog,
            alpha=alpha,
            beta=settings.match_beta,
            top_k=5,
            abv_intent=abv,
            abv_weight=settings.match_abv_weight,
        )
        all_sets.append({r.beer.id for r in results})
        for r in results:
            dom[r.dominant_component.value] += 1

    pairs = 0
    total_overlap = 0
    for i in range(len(all_sets)):
        for j in range(i + 1, len(all_sets)):
            total_overlap += len(all_sets[i] & all_sets[j])
            pairs += 1

    print(f"Catalog size: {len(catalog)}")
    print(f"Session alpha: {alpha}")
    print(f"Avg pairwise top-5 overlap: {total_overlap / pairs:.2f} / 5")
    print(f"Dominant components (16 sessions × 5 beers): {dict(dom)}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
