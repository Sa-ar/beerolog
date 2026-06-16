"""Seed the `beers` table with a real Israeli-market catalog.

Hand-curated literals (slice 75 framework left scrapers HITL). Each row
goes through the same shape the scraper pipeline would have produced:
ABV/IBU/hops/malts/yeast/color/body/sweetness/notes per style knowledge,
adventurousness via the locked formula, and a real 1536-D OpenAI embedding.

Usage:
    uv --directory apps/api run python scripts/seed_real_catalog.py

Idempotent: upserts on `id`. Skips re-embedding if the row already exists
with a matching `notes_source` and `tasting_notes` (cheap dogfood path).
Pass --reembed to force every row to re-embed.
"""

from __future__ import annotations

import argparse
import asyncio
import re
import sys
from dataclasses import dataclass
from typing import Literal

import asyncpg

sys.path.insert(0, str(__import__("pathlib").Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.services.embedding_service import get_embedding_client  # noqa: E402

Color = Literal["pale", "gold", "amber", "brown", "dark"]
Body = Literal["light", "medium", "full"]
Sweetness = Literal["dry", "balanced", "sweet"]
MarketTier = Literal["mainstream", "craft", "import"]
NotesLang = Literal["he", "en"]
NotesSource = Literal["brewery", "aggregator", "synthetic"]


@dataclass(frozen=True)
class SeedBeer:
    name: str
    brewery: str
    brewery_country: str  # ISO-2
    style: str
    abv: float
    color: Color
    market_tier: MarketTier
    tasting_notes: str
    name_hebrew: str | None = None
    ibu: int | None = None
    hops: tuple[str, ...] | None = None
    malts: tuple[str, ...] | None = None
    yeast: str | None = None
    body: Body | None = None
    sweetness: Sweetness | None = None
    notes_lang: NotesLang = "en"
    notes_source: NotesSource = "synthetic"
    image_url: str | None = None
    source_url: str | None = None


# Mainstream Israeli, craft Israeli, and imports commonly available on tap or
# in Israeli bottle shops. Tasting notes are short, style-faithful summaries.
CATALOG: tuple[SeedBeer, ...] = (
    # ----- Mainstream Israeli -----
    SeedBeer(
        name="Goldstar",
        name_hebrew="גולדסטר",
        brewery="Tempo",
        brewery_country="IL",
        style="Amber Lager",
        abv=4.9,
        ibu=20,
        color="amber",
        body="medium",
        sweetness="balanced",
        market_tier="mainstream",
        tasting_notes="Israel's flagship amber lager. Bready malt up front, gentle caramel, a clean finish with low bitterness. Everyday session beer.",
    ),
    SeedBeer(
        name="Maccabee Premium Lager",
        name_hebrew="מכבי",
        brewery="Tempo",
        brewery_country="IL",
        style="Pale Lager",
        abv=4.9,
        ibu=18,
        color="gold",
        body="light",
        sweetness="dry",
        market_tier="mainstream",
        tasting_notes="Crisp pale lager, light grainy malt, faint floral hop, dry finish. The default Israeli table beer.",
    ),
    SeedBeer(
        name="Carlsberg (IL)",
        brewery="Israel Beer Breweries",
        brewery_country="IL",
        style="Pale Lager",
        abv=5.0,
        ibu=18,
        color="gold",
        body="light",
        sweetness="dry",
        market_tier="mainstream",
        tasting_notes="Licensed Israeli brew of the Danish classic. Bright, clean, lightly hopped, crisp and refreshing.",
    ),
    SeedBeer(
        name="Tuborg (IL)",
        brewery="Israel Beer Breweries",
        brewery_country="IL",
        style="Pale Lager",
        abv=5.0,
        ibu=16,
        color="gold",
        body="light",
        sweetness="balanced",
        market_tier="mainstream",
        tasting_notes="Easy-drinking pale lager with a touch of sweetness. Soft body, low bitterness, mass-market friendly.",
    ),
    SeedBeer(
        name="Heineken (IL)",
        brewery="Tempo",
        brewery_country="IL",
        style="Pale Lager",
        abv=5.0,
        ibu=23,
        color="gold",
        body="light",
        sweetness="dry",
        market_tier="mainstream",
        tasting_notes="Locally brewed Heineken. Slight green-bottle hop bite over crisp pale malt; familiar everywhere.",
    ),
    # ----- Craft Israeli -----
    SeedBeer(
        name="Alexander Blazer",
        brewery="Alexander",
        brewery_country="IL",
        style="American IPA",
        abv=6.2,
        ibu=60,
        hops=("Citra", "Centennial", "Simcoe"),
        color="amber",
        body="medium",
        sweetness="balanced",
        market_tier="craft",
        tasting_notes="Resinous American IPA. Pine and grapefruit pith over a caramel malt backbone, firm bitter finish.",
    ),
    SeedBeer(
        name="Alexander Green",
        brewery="Alexander",
        brewery_country="IL",
        style="Pale Ale",
        abv=5.2,
        ibu=35,
        hops=("Cascade", "Citra"),
        color="gold",
        body="medium",
        sweetness="balanced",
        market_tier="craft",
        tasting_notes="Approachable Israeli pale ale. Citrus and stone-fruit hop aroma, soft malt, light dry finish.",
    ),
    SeedBeer(
        name="Alexander Black",
        brewery="Alexander",
        brewery_country="IL",
        style="Belgian Strong Dark Ale",
        abv=7.0,
        color="dark",
        body="full",
        sweetness="sweet",
        market_tier="craft",
        tasting_notes="Belgian-style dark strong ale. Dark fruit, brown sugar, clove esters, warming finish.",
    ),
    SeedBeer(
        name="Malka Stout",
        brewery="Malka",
        brewery_country="IL",
        style="Stout",
        abv=6.0,
        ibu=35,
        color="dark",
        body="full",
        sweetness="balanced",
        market_tier="craft",
        tasting_notes="Roasty Israeli stout. Coffee, dark chocolate, light molasses, smooth medium-full body.",
    ),
    SeedBeer(
        name="Malka Bohemian",
        brewery="Malka",
        brewery_country="IL",
        style="Czech Pilsner",
        abv=4.7,
        ibu=35,
        hops=("Saaz",),
        color="gold",
        body="light",
        sweetness="dry",
        market_tier="craft",
        tasting_notes="Saaz-driven Czech-style pilsner. Spicy floral hop, bready malt, snappy bitter finish.",
    ),
    SeedBeer(
        name="Malka Pale Ale",
        brewery="Malka",
        brewery_country="IL",
        style="Pale Ale",
        abv=5.5,
        ibu=40,
        color="gold",
        body="medium",
        sweetness="balanced",
        market_tier="craft",
        tasting_notes="Balanced pale ale, biscuit malt with American hop citrus and a clean bitter close.",
    ),
    SeedBeer(
        name="Herzl Saison",
        brewery="Herzl",
        brewery_country="IL",
        style="Saison",
        abv=6.5,
        ibu=25,
        yeast="Saison",
        color="pale",
        body="light",
        sweetness="dry",
        market_tier="craft",
        tasting_notes="Dry Belgian-style saison. Peppery yeast, lemon zest, effervescent and quenching.",
    ),
    SeedBeer(
        name="Herzl Stout",
        brewery="Herzl",
        brewery_country="IL",
        style="Stout",
        abv=5.8,
        color="dark",
        body="full",
        sweetness="balanced",
        market_tier="craft",
        tasting_notes="Smooth Israeli stout with espresso bitterness, cocoa, and a slightly sweet finish.",
    ),
    SeedBeer(
        name="BeerBazaar Gose",
        brewery="BeerBazaar",
        brewery_country="IL",
        style="Gose",
        abv=4.5,
        color="pale",
        body="light",
        sweetness="dry",
        market_tier="craft",
        tasting_notes="Tart wheat gose with salt and coriander. Light, briny, lemony — patio sour.",
    ),
    SeedBeer(
        name="BeerBazaar IPA",
        brewery="BeerBazaar",
        brewery_country="IL",
        style="American IPA",
        abv=6.5,
        ibu=65,
        hops=("Mosaic", "Citra"),
        color="gold",
        body="medium",
        sweetness="balanced",
        market_tier="craft",
        tasting_notes="West-coast leaning IPA. Tropical mosaic + citra over light bready malt; firm bitterness.",
    ),
    SeedBeer(
        name="Schnitt House Pale",
        brewery="Schnitt",
        brewery_country="IL",
        style="Pale Ale",
        abv=5.4,
        ibu=35,
        color="gold",
        body="medium",
        sweetness="balanced",
        market_tier="craft",
        tasting_notes="Schnitt's house pale ale. Floral hop nose, biscuit malt body, very drinkable.",
    ),
    SeedBeer(
        name="Negev Alon",
        brewery="Negev",
        brewery_country="IL",
        style="Amber Ale",
        abv=5.6,
        ibu=30,
        color="amber",
        body="medium",
        sweetness="balanced",
        market_tier="craft",
        tasting_notes="Caramel-forward amber ale from the south. Toasted malt, mild earthy hop, easy long finish.",
    ),
    SeedBeer(
        name="Negev Oasis",
        brewery="Negev",
        brewery_country="IL",
        style="Wheat Beer",
        abv=5.0,
        color="pale",
        body="light",
        sweetness="balanced",
        market_tier="craft",
        tasting_notes="Hazy desert wheat beer. Banana esters, light citrus, soft cloudy body.",
    ),
    SeedBeer(
        name="Shapiro Pils",
        brewery="Shapiro",
        brewery_country="IL",
        style="German Pilsner",
        abv=5.0,
        ibu=32,
        hops=("Hallertau",),
        color="gold",
        body="light",
        sweetness="dry",
        market_tier="craft",
        tasting_notes="Crisp German-style pilsner brewed in Jerusalem. Noble hop, cracker malt, clean.",
    ),
    SeedBeer(
        name="Shapiro Jem's Stout",
        brewery="Shapiro",
        brewery_country="IL",
        style="Oatmeal Stout",
        abv=6.0,
        color="dark",
        body="full",
        sweetness="sweet",
        market_tier="craft",
        tasting_notes="Velvety oatmeal stout. Chocolate, mild roast, creamy mouthfeel from flaked oats.",
    ),
    # ----- Imports common in IL -----
    SeedBeer(
        name="Hoegaarden Witbier",
        brewery="Hoegaarden",
        brewery_country="BE",
        style="Witbier",
        abv=4.9,
        color="pale",
        body="light",
        sweetness="balanced",
        market_tier="import",
        tasting_notes="Belgian witbier with coriander and curacao orange. Hazy, soft, slightly tart finish.",
    ),
    SeedBeer(
        name="Leffe Blonde",
        brewery="Leffe",
        brewery_country="BE",
        style="Belgian Blonde",
        abv=6.6,
        color="gold",
        body="medium",
        sweetness="sweet",
        market_tier="import",
        tasting_notes="Belgian abbey blonde. Honeyed malt, pear and clove esters, warming.",
    ),
    SeedBeer(
        name="Erdinger Weissbier",
        brewery="Erdinger",
        brewery_country="DE",
        style="Hefeweizen",
        abv=5.3,
        color="gold",
        body="medium",
        sweetness="balanced",
        market_tier="import",
        tasting_notes="Bavarian hefeweizen. Banana and clove from the yeast, fluffy wheat body, gentle finish.",
    ),
    SeedBeer(
        name="Weihenstephaner Hefeweissbier",
        brewery="Weihenstephan",
        brewery_country="DE",
        style="Hefeweizen",
        abv=5.4,
        color="gold",
        body="medium",
        sweetness="balanced",
        market_tier="import",
        tasting_notes="Benchmark Bavarian wheat beer. Bright banana, vanilla clove, lush wheat mouthfeel.",
    ),
    SeedBeer(
        name="Guinness Draught",
        brewery="Guinness",
        brewery_country="IE",
        style="Irish Stout",
        abv=4.2,
        ibu=45,
        color="dark",
        body="medium",
        sweetness="dry",
        market_tier="import",
        tasting_notes="Iconic dry Irish stout. Coffee and cocoa, creamy nitro head, dry roasted finish.",
    ),
    SeedBeer(
        name="Corona Extra",
        brewery="Grupo Modelo",
        brewery_country="MX",
        style="Pale Lager",
        abv=4.6,
        ibu=18,
        color="pale",
        body="light",
        sweetness="balanced",
        market_tier="import",
        tasting_notes="Light Mexican pale lager. Mild grainy malt, very low bitterness, designed for a lime wedge.",
    ),
)


# --- Market-tier weight, mirror of packages/db/scripts/seed_catalog/adventurousness.ts ---
_TIER_WEIGHT: dict[MarketTier, float] = {"mainstream": 0.0, "craft": 0.5, "import": 0.3}


def _compute_style_rarity(catalog: tuple[SeedBeer, ...]) -> dict[str, float]:
    counts: dict[str, int] = {}
    for b in catalog:
        counts[b.style] = counts.get(b.style, 0) + 1
    total = len(catalog)
    return {style: max(0.0, 1.0 - (n / total) * 3.0) for style, n in counts.items()}


def _compute_adventurousness(beer: SeedBeer, rarity: dict[str, float]) -> float:
    tier = _TIER_WEIGHT[beer.market_tier]
    rare = rarity.get(beer.style, 0.0) * 0.3
    abv = max(0.0, min(0.2, (beer.abv - 7.0) / 5.0))
    return max(0.0, min(1.0, tier + rare + abv))


def _slug(value: str) -> str:
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


def _beer_id(beer: SeedBeer) -> str:
    return f"{_slug(beer.brewery)}-{_slug(beer.name)}"


def _embedding_text(beer: SeedBeer) -> str:
    parts: list[str] = [
        f"{beer.name} by {beer.brewery} ({beer.brewery_country}).",
        f"Style: {beer.style}.",
        f"ABV {beer.abv}%.",
    ]
    if beer.ibu is not None:
        parts.append(f"IBU {beer.ibu}.")
    if beer.hops:
        parts.append(f"Hops: {', '.join(beer.hops)}.")
    if beer.malts:
        parts.append(f"Malts: {', '.join(beer.malts)}.")
    if beer.yeast:
        parts.append(f"Yeast: {beer.yeast}.")
    parts.append(f"Color {beer.color}.")
    if beer.body:
        parts.append(f"Body {beer.body}.")
    if beer.sweetness:
        parts.append(f"Sweetness {beer.sweetness}.")
    parts.append(f"Market tier: {beer.market_tier}.")
    parts.append(beer.tasting_notes)
    return " ".join(parts)


UPSERT_SQL = """
INSERT INTO beers (
    id, name, name_hebrew, brewery, brewery_country, style, abv, ibu,
    hops, malts, yeast, color, body, sweetness, market_tier,
    tasting_notes, tasting_notes_lang, notes_source, adventurousness,
    embedding, image_url, source_url
)
VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    $9, $10, $11, $12::beer_color, $13::beer_body, $14::beer_sweetness, $15::market_tier,
    $16, $17::notes_lang, $18::notes_source, $19,
    $20::vector, $21, $22
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    name_hebrew = EXCLUDED.name_hebrew,
    brewery = EXCLUDED.brewery,
    brewery_country = EXCLUDED.brewery_country,
    style = EXCLUDED.style,
    abv = EXCLUDED.abv,
    ibu = EXCLUDED.ibu,
    hops = EXCLUDED.hops,
    malts = EXCLUDED.malts,
    yeast = EXCLUDED.yeast,
    color = EXCLUDED.color,
    body = EXCLUDED.body,
    sweetness = EXCLUDED.sweetness,
    market_tier = EXCLUDED.market_tier,
    tasting_notes = EXCLUDED.tasting_notes,
    tasting_notes_lang = EXCLUDED.tasting_notes_lang,
    notes_source = EXCLUDED.notes_source,
    adventurousness = EXCLUDED.adventurousness,
    embedding = EXCLUDED.embedding,
    image_url = EXCLUDED.image_url,
    source_url = EXCLUDED.source_url
"""


def _vector_text(values: list[float]) -> str:
    return "[" + ",".join(repr(float(v)) for v in values) + "]"


async def main(reembed: bool) -> None:
    if not settings.database_url:
        raise SystemExit("DATABASE_URL not set")
    if not settings.openai_api_key:
        raise SystemExit("OPENAI_API_KEY not set")

    rarity = _compute_style_rarity(CATALOG)
    client = get_embedding_client()
    pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=4)
    assert pool is not None
    try:
        async with pool.acquire() as conn:
            existing_ids: set[str] = set()
            if not reembed:
                rows = await conn.fetch("SELECT id FROM beers")
                existing_ids = {r["id"] for r in rows}

            for beer in CATALOG:
                bid = _beer_id(beer)
                if bid in existing_ids:
                    print(f"  skip (exists): {bid}")
                    continue
                print(f"  embedding   : {bid}")
                embedding = await client.embed(_embedding_text(beer))
                adv = _compute_adventurousness(beer, rarity)
                await conn.execute(
                    UPSERT_SQL,
                    bid,
                    beer.name,
                    beer.name_hebrew,
                    beer.brewery,
                    beer.brewery_country,
                    beer.style,
                    beer.abv,
                    beer.ibu,
                    list(beer.hops) if beer.hops else None,
                    list(beer.malts) if beer.malts else None,
                    beer.yeast,
                    beer.color,
                    beer.body,
                    beer.sweetness,
                    beer.market_tier,
                    beer.tasting_notes,
                    beer.notes_lang,
                    beer.notes_source,
                    adv,
                    _vector_text(embedding),
                    beer.image_url,
                    beer.source_url,
                )
        print(f"\nSeeded {len(CATALOG)} beers (reembed={reembed}).")
    finally:
        await pool.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--reembed",
        action="store_true",
        help="Re-embed every beer (otherwise rows already present in `beers` are skipped).",
    )
    asyncio.run(main(ap.parse_args().reembed))
