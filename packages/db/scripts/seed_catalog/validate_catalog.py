#!/usr/bin/env python3
"""Spot-check israel-catalog.json for duplicates, gaps, and data-quality issues."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

REPO = Path(__file__).resolve().parents[4]
CATALOG_PATH = REPO / "packages/db/data/israel-catalog.json"
REPORT_PATH = REPO / "packages/db/data/israel-catalog-report.txt"

FORBIDDEN = re.compile(r"untappd|assets\.untappd", re.I)


def normalize_key(brewery: str, name: str) -> str:
    b = brewery.lower().strip()
    n = name.lower().strip()
    n = re.sub(r"\s*\([^)]*\)", "", n)
    n = re.sub(r"^schnitt\s+", "", n)
    return f"{b}|{n}"


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    lines: list[str] = []
    lines.append(f"Catalog spot-check — {len(catalog)} beers\n")

    # Duplicates
    keys = [normalize_key(b["brewery"], b["name"]) for b in catalog]
    dup_counts = Counter(keys)
    dups = [k for k, n in dup_counts.items() if n > 1]
    lines.append(f"Duplicate keys: {len(dups)}")
    for k in dups[:20]:
        matches = [b for b in catalog if normalize_key(b["brewery"], b["name"]) == k]
        lines.append(f"  {k}: {[m['id'] for m in matches]}")

    # Forbidden refs
    bad = []
    for b in catalog:
        blob = json.dumps(b)
        if FORBIDDEN.search(blob):
            bad.append(b["id"])
    lines.append(f"\nForbidden Untappd refs: {len(bad)}")
    for bid in bad[:10]:
        lines.append(f"  {bid}")

    # Country XX
    xx = [b for b in catalog if b.get("breweryCountry") == "XX"]
    lines.append(f"\nbreweryCountry=XX: {len(xx)}")
    for b in xx[:15]:
        lines.append(f"  {b['brewery']} — {b['name']}")

    # Missing fields
    no_img = [b["id"] for b in catalog if not b.get("imageUrl")]
    no_ibu = sum(1 for b in catalog if b.get("ibu") is None)
    synthetic = sum(1 for b in catalog if b.get("notesSource") == "synthetic")
    no_source = [b["id"] for b in catalog if not b.get("sourceUrl")]
    lines.append(f"\nMissing image: {len(no_img)}")
    lines.append(f"Missing IBU: {no_ibu}")
    lines.append(f"Synthetic notes: {synthetic}")
    lines.append(f"No sourceUrl: {len(no_source)}")

    # ABV outliers
    abv_high = [b for b in catalog if b.get("abv", 0) > 14]
    abv_zero = [b for b in catalog if b.get("abv", 0) <= 0]
    lines.append(f"\nABV > 14%: {len(abv_high)}")
    for b in abv_high[:10]:
        lines.append(f"  {b['id']} ({b['abv']}%)")
    lines.append(f"ABV <= 0: {len(abv_zero)}")

    # Non-blob hosted images
    local_only = [
        b["id"]
        for b in catalog
        if b.get("imageUrl") and "blob.vercel-storage.com" not in b["imageUrl"]
    ]
    lines.append(f"\nimageUrl not on Vercel Blob: {len(local_only)}")
    for bid in local_only[:15]:
        lines.append(f"  {bid}")
    bundles = []
    for b in catalog:
        name = f"{b.get('name','')} {b.get('nameHebrew','')}"
        if re.search(
            r"6[\s-]?pack|six[\s-]?pack|beer set|mixed|cans case|icons|trio|\bkeg\b|3\+1|"
            r"night shift mix|שישיית|מארז|ארגז|סט בירה|gin |ג'ין|spirit|מזוקק",
            name,
            re.I,
        ):
            bundles.append(b["id"])
    lines.append(f"\nLikely bundle/spirit SKUs: {len(bundles)}")
    for bid in bundles[:20]:
        lines.append(f"  {bid}")

    # Countries
    lines.append("\nCountries:")
    for country, n in Counter(b["breweryCountry"] for b in catalog).most_common():
        lines.append(f"  {country}: {n}")

    report = "\n".join(lines) + "\n"
    REPORT_PATH.write_text(report, encoding="utf-8")
    print(report)
    print(f"Report written → {REPORT_PATH}")


if __name__ == "__main__":
    main()
