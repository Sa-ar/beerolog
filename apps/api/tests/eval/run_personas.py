"""Persona evaluation harness for the matcher.

Runs each persona end to end through the real composers and the real ranker,
and reports precision@5 and mean reciprocal rank per persona and in aggregate.

Relevance: a returned beer counts as relevant if it appears in the persona's
`expected_top_5` OR shares a style family with one of them.

Offline by default — text is vectorised by `offline_embedding.project`, a
fixed deterministic projection into the catalog's eight axes, so the harness
needs no API key and returns the same numbers on every machine. `--live`
swaps in the real embedding service (needs OPENAI_API_KEY).

The floor is a REGRESSION GATE, not a quality claim: it is set below the
current score so an unrelated change that degrades ranking fails CI. Below
the floor the harness exits 1.

Usage:
    python tests/eval/run_personas.py
    python tests/eval/run_personas.py --compare-beta   # A/B the novelty re-rank
    python tests/eval/run_personas.py --live           # real embeddings
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

# apps/api, so `app.*` and `tests.*` import the same way as under pytest.
_API_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(_API_ROOT))

from app.api_contracts import OnboardingAnswers, SessionIntent  # noqa: E402
from app.placeholder_catalog import PLACEHOLDER_CATALOG, get_embedded_catalog  # noqa: E402
from app.services import baseline_taste, session_intent  # noqa: E402
from app.services.embedding_service import get_embedding_client  # noqa: E402
from app.services.match_engine import rank  # noqa: E402
from tests.eval.offline_embedding import OfflineEmbeddingClient  # noqa: E402

# Style-family groups for the relaxed relevance definition.
STYLE_FAMILIES: dict[str, set[str]] = {
    "ipa": {"American IPA", "Hazy IPA", "Double IPA"},
    "pale_ale": {"Pale Ale"},
    "lager": {"Lager", "Pale Lager", "Amber Lager", "Pilsner"},
    "stout": {"Stout", "Imperial Stout", "Irish Stout", "Porter"},
    "wheat": {"Witbier", "Hefeweizen"},
    "sour": {"Gose", "Berliner Weisse", "Sour"},
    "farmhouse": {"Saison"},
}


def _family_for_style(style: str) -> str | None:
    for family, members in STYLE_FAMILIES.items():
        if style in members:
            return family
    return None


async def evaluate_persona(persona: dict, *, alpha: float, beta: float, client, catalog) -> dict:
    answers = OnboardingAnswers(**persona["onboarding"])
    baseline_text = baseline_taste.compose_text(answers)
    baseline_dials = baseline_taste.compose_dials(answers)
    baseline_vec = await client.embed(baseline_text)

    session_vec = None
    if persona.get("session"):
        intent = SessionIntent(**persona["session"])
        session_vec = await client.embed(session_intent.compose_text(intent))

    results = rank(
        baseline_embedding=baseline_vec,
        session_embedding=session_vec,
        novelty_affinity=baseline_dials.novelty_affinity,
        catalog=catalog,
        alpha=alpha,
        beta=beta,
        top_k=5,
    )
    returned_ids = [r.beer.id for r in results]
    returned_styles = {r.beer.style for r in results}
    expected = set(persona["expected_top_5"])
    expected_styles = {b.style for b in catalog if b.id in expected}
    expected_families = {f for s in expected_styles if (f := _family_for_style(s))}

    # Relevance: exact id match OR shared style-family.
    relevant: list[bool] = []
    for r in results:
        if r.beer.id in expected:
            relevant.append(True)
        elif _family_for_style(r.beer.style) in expected_families:
            relevant.append(True)
        else:
            relevant.append(False)

    p_at_5 = sum(relevant) / 5
    mrr = 0.0
    for i, is_rel in enumerate(relevant):
        if is_rel:
            mrr = 1.0 / (i + 1)
            break
    return {
        "id": persona["id"],
        "p_at_5": p_at_5,
        "mrr": mrr,
        "returned_ids": returned_ids,
        "returned_styles": sorted(returned_styles),
    }


async def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--alpha", type=float, default=0.6)
    ap.add_argument("--beta", type=float, default=0.3)
    ap.add_argument("--floor", type=float, default=0.4)
    ap.add_argument(
        "--live",
        action="store_true",
        help="Use the real embedding service instead of the offline projection",
    )
    ap.add_argument(
        "--compare-beta",
        action="store_true",
        help="Run side-by-side with beta=0 as well (Higgins hypothesis test)",
    )
    args = ap.parse_args()

    if args.live:
        client = get_embedding_client()
        catalog = await get_embedded_catalog(client)
        mode = "live embeddings"
    else:
        client = OfflineEmbeddingClient()
        catalog = PLACEHOLDER_CATALOG
        mode = "offline projection"

    personas_path = Path(__file__).parent / "personas.json"
    data = json.loads(personas_path.read_text())
    personas = data["personas"]

    print(f"\n=== Persona harness ({mode}, alpha={args.alpha}, beta={args.beta}) ===\n")
    results = [
        await evaluate_persona(p, alpha=args.alpha, beta=args.beta, client=client, catalog=catalog)
        for p in personas
    ]

    for r in results:
        print(f"  {r['id']:40s}  P@5={r['p_at_5']:.2f}  MRR={r['mrr']:.2f}")
    agg_p = sum(r["p_at_5"] for r in results) / max(1, len(results))
    agg_mrr = sum(r["mrr"] for r in results) / max(1, len(results))
    print(f"\n  AGGREGATE   P@5={agg_p:.3f}   MRR={agg_mrr:.3f}")

    if args.compare_beta:
        print("\n=== Side-by-side (beta=0, Higgins-null) ===\n")
        null_results = [
            await evaluate_persona(p, alpha=args.alpha, beta=0.0, client=client, catalog=catalog)
            for p in personas
        ]
        for r in null_results:
            print(f"  {r['id']:40s}  P@5={r['p_at_5']:.2f}  MRR={r['mrr']:.2f}")
        null_agg = sum(r["p_at_5"] for r in null_results) / max(1, len(null_results))
        print(f"\n  beta=0 AGGREGATE   P@5={null_agg:.3f}")
        delta = agg_p - null_agg
        print(f"  Delta (beta={args.beta} - beta=0)  P@5={delta:+.3f}")

    if agg_p < args.floor:
        print(f"\nFAIL: aggregate P@5 {agg_p:.3f} < floor {args.floor:.3f}")
        return 1
    print(f"\nPASS: aggregate P@5 {agg_p:.3f} ≥ floor {args.floor:.3f}")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
