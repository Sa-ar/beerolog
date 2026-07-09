"""is_seedable gating for the catalog seeder.

The scrape pipeline only seeds beers sourced from approved craft retailers
(beerandbeyond / schnitt), which don't carry Israeli mass-market lagers. Curated
rows (hand-vetted canonical beers) bypass that source/image requirement so the
catalog can hold e.g. Goldstar — but Untappd content is still rejected.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest  # type: ignore[import-not-found]

_PATH = Path(__file__).resolve().parents[1] / "scripts" / "seed_real_catalog.py"
_spec = importlib.util.spec_from_file_location("seed_real_catalog", _PATH)
assert _spec and _spec.loader
seed = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(seed)


def _row(**over: object) -> dict[str, object]:
    row: dict[str, object] = {
        "id": "tempo-goldstar",
        "name": "Goldstar",
        "brewery": "Tempo",
        "breweryCountry": "IL",
        "style": "Dark Lager",
        "abv": 4.9,
        "color": "amber",
        "marketTier": "mainstream",
        "adventurousness": 0.2,
        "curated": True,
    }
    row.update(over)
    return row


def test_curated_row_seedable_without_retailer_source_or_image() -> None:
    assert seed.is_seedable(_row()) is True


def test_non_curated_row_without_source_is_not_seedable() -> None:
    assert seed.is_seedable(_row(curated=False)) is False


def test_curated_row_still_rejects_untappd() -> None:
    with pytest.raises(SystemExit):
        seed.is_seedable(_row(sourceUrl="https://untappd.com/b/goldstar"))


def test_curated_bundle_still_filtered() -> None:
    # Curated bypasses the source gate, not the bundle/SKU gate.
    assert seed.is_seedable(_row(name="Goldstar 6-pack")) is False
