"""Persona evaluation harness (slice #79).

Runs each persona end-to-end through the actual composers + Match engine,
reports precision@5 and mean reciprocal rank per persona + aggregate.

Relevance definition per PRD §Testing Decisions: a returned beer counts
as relevant if it appears in the persona's expected_top_5 OR shares a
style-family with one of them.

Floor: aggregate P@5 ≥ 0.4 (lowered from 0.6 per the audit; see PRD).
Below floor, the harness exits with code 1 — used as a CI gate.

Usage:
    python -m apps.api.tests.eval.run_personas
    python -m apps.api.tests.eval.run_personas --beta 0  # disable novelty re-rank

Slice #79 ships the runnable harness. Slice 79's HITL portion is
authoring the remaining 5 personas plus expected_top_5 lists drawn
from the seeded catalog (which arrives in slice #75).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(_ROOT / "apps" / "api"))

from app.api_contracts import OnboardingAnswers, SessionIntent  # noqa: E402
from app.placeholder_catalog import PLACEHOLDER_CATALOG  # noqa: E402
from app.services import baseline_taste, session_intent  # noqa: E402
from app.services.match_engine import rank  # noqa: E402

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


class _StubEmbeddingClient:
    """Deterministic 8-D stub matching the placeholder catalog's axes.

    The harness intentionally uses the placeholder catalog (slice #74)
    rather than the production one so v1 is independent of slice #75's
    HITL completion.
    """

    async def embed(self, text: str) -> list[float]:
        h = hash(text)
        return [((h >> (i * 4)) & 0xF) / 15.0 for i in range(8)]


async def evaluate_persona(persona: dict, *, alpha: float, beta: float) -> dict:
    client = _StubEmbeddingClient()
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
        catalog=PLACEHOLDER_CATALOG,
        alpha=alpha,
        beta=beta,
        top_k=5,
    )
    returned_ids = [r.beer.id for r in results]
    returned_styles = {r.beer.style for r in results}
    expected = set(persona["expected_top_5"])
    expected_styles = {b.style for b in PLACEHOLDER_CATALOG if b.id in expected}
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
        "--compare-beta",
        action="store_true",
        help="Run side-by-side with beta=0 as well (Higgins hypothesis test)",
    )
    args = ap.parse_args()

    personas_path = Path(__file__).parent / "personas.json"
    data = json.loads(personas_path.read_text())
    personas = data["personas"]

    print(f"\n=== Persona harness (alpha={args.alpha}, beta={args.beta}) ===\n")
    results = [await evaluate_persona(p, alpha=args.alpha, beta=args.beta) for p in personas]

    for r in results:
        print(f"  {r['id']:40s}  P@5={r['p_at_5']:.2f}  MRR={r['mrr']:.2f}")
    agg_p = sum(r["p_at_5"] for r in results) / max(1, len(results))
    agg_mrr = sum(r["mrr"] for r in results) / max(1, len(results))
    print(f"\n  AGGREGATE   P@5={agg_p:.3f}   MRR={agg_mrr:.3f}")

    if args.compare_beta:
        print("\n=== Side-by-side (beta=0, Higgins-null) ===\n")
        null_results = [await evaluate_persona(p, alpha=args.alpha, beta=0.0) for p in personas]
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
