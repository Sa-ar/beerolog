"""Seed the `beers` table from packages/db/data/israel-catalog.json.

Each row is embedded with the locked composeBeerText template (mirrors
packages/db/scripts/seed_catalog/compose_text.ts). Adventurousness comes
from the catalog JSON (computed at merge time).

Usage:
    uv --directory apps/api run python scripts/seed_real_catalog.py
    uv --directory apps/api run python scripts/seed_real_catalog.py --reembed

Idempotent: skips rows already in `beers` unless --reembed is passed.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import asyncpg

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import settings  # noqa: E402
from app.services.embedding_service import get_embedding_client  # noqa: E402
from app.services.sensory_bridge import compose_beer_sensory_bridge_from_row  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CATALOG = REPO_ROOT / "packages/db/data/israel-catalog.json"

FORBIDDEN_UNTAPPD = re.compile(r"untappd|assets\.untappd", re.I)
APPROVED_SOURCE_HOSTS = ("beerandbeyond.com", "schnitt.co.il")
BLOB_HOST = "blob.vercel-storage.com"


def _row_blob(row: dict[str, Any]) -> str:
    return json.dumps(row, ensure_ascii=False)


def assert_no_untappd(row: dict[str, Any]) -> None:
    blob = _row_blob(row)
    if FORBIDDEN_UNTAPPD.search(blob):
        raise SystemExit(f"Catalog row {row.get('id')} contains forbidden Untappd reference")


def is_seedable(row: dict[str, Any]) -> bool:
    """Only seed rows with an approved retailer/brewery source (not Untappd lineage)."""
    assert_no_untappd(row)
    name = row.get("name", "")
    he = row.get("nameHebrew")
    if re.search(
        r"\b6[\s-]?pack\b|\bbeer\s+set\b|\bcans?\s+case\b|\bmixed\b|\bicons\b|\btrio\b|"
        r"\bkeg\b|3\+1|night\s+shift\s+mix|שישיית|מארז|ארגז|סט בירה|מיקס פחיות",
        f"{name} {he or ''}",
        re.I,
    ):
        return False
    if re.search(
        r"gin |ג'ין|beer spirit|ביר ספיריט|מזוקק|distilled|תזקיק",
        f"{name} {he or ''}",
        re.I,
    ):
        return False
    src = row.get("sourceUrl") or ""
    if not src:
        return False
    if FORBIDDEN_UNTAPPD.search(src):
        return False
    host = urlparse(src).netloc.lower().removeprefix("www.")
    if not any(host == h or host.endswith("." + h) for h in APPROVED_SOURCE_HOSTS):
        return False
    img = row.get("imageUrl")
    if not img or BLOB_HOST not in str(img):
        return False
    return True


def filter_seedable(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], int]:
    kept: list[dict[str, Any]] = []
    skipped = 0
    for row in rows:
        if is_seedable(row):
            kept.append(row)
        else:
            skipped += 1
    return kept, skipped


def compose_beer_text(row: dict[str, Any]) -> str:
    """Mirror of packages/db/scripts/seed_catalog/compose_text.ts."""
    parts: list[str] = [f"{row['style']} from {row['brewery']}, {row['breweryCountry']}."]
    if row.get("ibu") is not None:
        parts.append(f"{row['abv']}% ABV, IBU {row['ibu']}.")
    else:
        parts.append(f"{row['abv']}% ABV.")

    hops = row.get("hops")
    if hops:
        parts.append(f"Hops: {', '.join(hops)}.")
    malts = row.get("malts")
    if malts:
        parts.append(f"Malts: {', '.join(malts)}.")
    if row.get("yeast"):
        parts.append(f"{row['yeast']} yeast.")

    color_part = f"{row['color']} colour"
    body_part = f", {row['body']} body" if row.get("body") else ""
    sweet_part = f", {row['sweetness']} finish" if row.get("sweetness") else ""
    parts.append(f"{color_part}{body_part}{sweet_part}.")

    if row.get("tastingNotes"):
        parts.append(row["tastingNotes"])

    sensory = compose_beer_sensory_bridge_from_row(row)
    if sensory:
        parts.append(sensory)

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


def load_catalog(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        raise SystemExit(f"Catalog not found: {path}")
    rows = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(rows, list) or not rows:
        raise SystemExit(f"Catalog empty or invalid: {path}")
    required = {
        "id",
        "name",
        "brewery",
        "breweryCountry",
        "style",
        "abv",
        "color",
        "marketTier",
        "adventurousness",
    }
    for row in rows:
        missing = required - set(row)
        if missing:
            raise SystemExit(f"Catalog row {row.get('id')} missing fields: {missing}")
        assert_no_untappd(row)
    if FORBIDDEN_UNTAPPD.search(path.read_text(encoding="utf-8")):
        raise SystemExit("Catalog file contains forbidden Untappd references")
    return rows


async def main(reembed: bool, catalog_path: Path, limit: int | None) -> None:
    if not settings.database_url:
        raise SystemExit("DATABASE_URL not set")
    if not settings.openai_api_key:
        raise SystemExit("OPENAI_API_KEY not set")

    catalog = load_catalog(catalog_path)
    catalog, excluded = filter_seedable(catalog)
    print(f"Seedable rows: {len(catalog)} (excluded {excluded} without approved source / Untappd)")
    if not catalog:
        raise SystemExit("No seedable rows after Untappd / source filter")
    if limit is not None:
        catalog = catalog[:limit]

    client = get_embedding_client()
    pool = await asyncpg.create_pool(dsn=settings.database_url, min_size=1, max_size=4)
    assert pool is not None
    seeded = 0
    skipped = 0
    try:
        async with pool.acquire() as conn:
            # Purge legacy / non-approved rows (Untappd lineage or old hand-seed)
            deleted = await conn.execute(
                """
                DELETE FROM beers
                WHERE source_url ILIKE '%untappd%'
                   OR image_url ILIKE '%untappd%'
                   OR source_url IS NULL
                   OR (
                     source_url NOT ILIKE '%beerandbeyond%'
                     AND source_url NOT ILIKE '%schnitt%'
                   )
                """
            )
            if deleted and deleted != "DELETE 0":
                print(f"Purged non-approved / Untappd-linked rows: {deleted}")

            existing_ids: set[str] = set()
            if not reembed:
                rows = await conn.fetch("SELECT id FROM beers")
                existing_ids = {r["id"] for r in rows}

            for row in catalog:
                bid = row["id"]
                if bid in existing_ids and not reembed:
                    skipped += 1
                    continue
                print(f"  embedding: {bid}")
                embedding = await client.embed(compose_beer_text(row))
                await conn.execute(
                    UPSERT_SQL,
                    bid,
                    row["name"],
                    row.get("nameHebrew"),
                    row["brewery"],
                    row["breweryCountry"],
                    row["style"],
                    float(row["abv"]),
                    row.get("ibu"),
                    row.get("hops"),
                    row.get("malts"),
                    row.get("yeast"),
                    row["color"],
                    row.get("body"),
                    row.get("sweetness"),
                    row["marketTier"],
                    row.get("tastingNotes") or "",
                    row.get("tastingNotesLang") or "en",
                    row.get("notesSource") or "synthetic",
                    float(row["adventurousness"]),
                    _vector_text(embedding),
                    row.get("imageUrl"),
                    row.get("sourceUrl"),
                )
                seeded += 1
        print(f"\nSeeded {seeded} beers, skipped {skipped} (reembed={reembed}).")
    finally:
        await pool.close()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--reembed",
        action="store_true",
        help="Re-embed every beer (otherwise rows already present in `beers` are skipped).",
    )
    ap.add_argument(
        "--catalog",
        type=Path,
        default=DEFAULT_CATALOG,
        help="Path to israel-catalog.json",
    )
    ap.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Seed only the first N rows (smoke test).",
    )
    args = ap.parse_args()
    asyncio.run(main(args.reembed, args.catalog, args.limit))
