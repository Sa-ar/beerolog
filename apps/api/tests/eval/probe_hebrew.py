"""Hebrew retrieval probe.

Measures top-5 hit rate of Hebrew queries against an English-keyed
catalog. Gate: Hebrew hit rate ≥ 70% of the English baseline. Below
the gate, the catalog needs Hebrew-side text rather than relying on the
embedding model to bridge the two scripts.

Hits the real embedding service, so it costs a few cents per run and
needs OPENAI_API_KEY. The translated descriptions were reviewed by a
native speaker.

Usage:
    OPENAI_API_KEY=... python tests/eval/probe_hebrew.py
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

# (English description, Hebrew description), one per catalog beer.
PAIRS: list[tuple[str, str]] = [
    (
        "American IPA from Alexander Brewery, Israel. 6.2% ABV, IBU 60. Hops: Citra, Mosaic, Centennial. Citrus and pine forward, dry finish, medium-light body.",
        "אייל הודי אמריקאי ממבשלת אלכסנדר, ישראל. 6.2% אלכוהול, 60 יחידות מרירות. כשות: סיטרה, מוזאייק, סנטניאל. הדרים ואורן בחזית, סיומת יבשה, גוף קל-בינוני.",
    ),
    (
        "Pale ale from Alexander Brewery, Israel. 5.2% ABV, IBU 35. Pale gold, moderate hop aroma, balanced malt backbone, easy finish.",
        "אייל בהיר ממבשלת אלכסנדר, ישראל. 5.2% אלכוהול, 35 יחידות מרירות. זהוב בהיר, ארומת כשות מתונה, גוף לתת מאוזן, סיומת קלה.",
    ),
    (
        "Amber lager from Tempo, Israel. 4.9% ABV, IBU 18. Mainstream, caramel malt, low bitterness, crisp and approachable.",
        "לאגר ענברי מטמפו, ישראל. 4.9% אלכוהול, 18 יחידות מרירות. מיינסטרים, לתת קרמלי, מרירות נמוכה, פריך ונגיש.",
    ),
    (
        "Pale lager from Tempo, Israel. 4.9% ABV, IBU 12. Light gold, very low bitterness, clean and highly carbonated.",
        "לאגר בהיר מטמפו, ישראל. 4.9% אלכוהול, 12 יחידות מרירות. זהוב בהיר, מרירות נמוכה מאוד, נקי ומוגז מאוד.",
    ),
    (
        "Stout from Malka Brewery, Israel. 6.0% ABV, IBU 45. Dark, roasted coffee and dark chocolate, full body, dry roast finish.",
        "סטאוט ממבשלת מלכה, ישראל. 6.0% אלכוהול, 45 יחידות מרירות. כהה, קפה קלוי ושוקולד מריר, גוף מלא, סיומת קלויה ויבשה.",
    ),
    (
        "Saison from Herzl Brewery, Israel. 6.5% ABV, IBU 28. Farmhouse yeast, peppery spice, dry, fruity esters, high carbonation.",
        "סזון ממבשלת הרצל, ישראל. 6.5% אלכוהול, 28 יחידות מרירות. שמרי חווה, תבלין פלפלי, יבש, אסטרים פירותיים, מוגז מאוד.",
    ),
    (
        "Gose from BeerBazaar, Israel. 4.5% ABV, IBU 10. Tart and salty, coriander, low bitterness, refreshing sour wheat beer.",
        "גוזה מביר בזאר, ישראל. 4.5% אלכוהול, 10 יחידות מרירות. חמצמץ ומלוח, כוסברה, מרירות נמוכה, בירת חיטה חמוצה ומרעננת.",
    ),
    (
        "House pale ale from Schnitt, Israel. 5.4% ABV, IBU 38. Citrus hop aroma, light malt, sessionable craft pale ale.",
        "אייל בהיר של הבית משניט, ישראל. 5.4% אלכוהול, 38 יחידות מרירות. ארומת כשות הדרית, לתת קל, אייל בהיר בוטיק לשתייה ממושכת.",
    ),
    (
        "Witbier from Hoegaarden, Belgium. 4.9% ABV. Cloudy wheat beer with orange peel and coriander, soft body, low bitterness.",
        "ויטביר מהוגארדן, בלגיה. 4.9% אלכוהול. בירת חיטה עכורה עם קליפת תפוז וכוסברה, גוף רך, מרירות נמוכה.",
    ),
    (
        "Irish stout from Guinness, Ireland. 4.2% ABV, IBU 40. Very dark, roasted barley, nitro-smooth creamy head, dry finish.",
        "סטאוט אירי מגינס, אירלנד. 4.2% אלכוהול, 40 יחידות מרירות. כהה מאוד, שעורה קלויה, קצף קרמי חלק מניטרו, סיומת יבשה.",
    ),
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
    if not PAIRS:
        print("No pairs to evaluate.")
        return 2

    top1 = 0
    top5 = 0
    reciprocal_ranks: list[float] = []
    for i in range(len(PAIRS)):
        scores = [(j, cosine(he_vecs[i], en_vecs[j])) for j in range(len(PAIRS))]
        scores.sort(key=lambda kv: kv[1], reverse=True)
        order = [j for j, _ in scores]
        rank_of_true = order.index(i) + 1
        reciprocal_ranks.append(1.0 / rank_of_true)
        top1 += rank_of_true == 1
        top5 += rank_of_true <= 5
        print(f"  {i:2d}  rank of true pair: {rank_of_true}")

    n = len(PAIRS)
    mrr = sum(reciprocal_ranks) / n
    print(f"\nHebrew -> English retrieval over {n} beers")
    print(f"  top-1: {top1}/{n} = {top1 / n:.2%}")
    print(f"  top-5: {top5}/{n} = {top5 / n:.2%}")
    print(f"  MRR:   {mrr:.3f}")
    print(f"\nGate: top-5 ≥ 70%. {'PASS' if top5 / n >= 0.7 else 'FAIL'}")
    if top5 / n < 0.7:
        print("\nRemediation: the embedding model is not bridging the two scripts")
        print("well enough. Store Hebrew-side catalog text instead of relying on")
        print("cross-lingual similarity, or move to a multilingual embedding model.")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
