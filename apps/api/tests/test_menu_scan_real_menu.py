"""Scan pipeline against a real published tap-board menu.

Beer lines below are transcribed from a photo of a real pub tap board posted
publicly on Google (BrewDog-style craft list). We can't call the OpenAI vision
model in CI, so the LLM is stubbed to return exactly the lines it would extract
from that photo; the real fuzzy matcher then runs against a realistic catalog.

This covers what the clean-name stubs don't: brewery+name lines, style
suffixes, and a beer that's on the board but not in our catalog.
"""

from unittest.mock import AsyncMock

import pytest

from app.services.fuzzy_matcher import CatalogEntry
from app.services.menu_scanner import scan_menu

# A realistic catalog: names as we store them, not always as the board prints them.
CATALOG = [
    CatalogEntry(id="pt", name="Punk IPA", brewery="BrewDog"),
    CatalogEntry(id="dm", name="Dead Pony Club", brewery="BrewDog"),
    CatalogEntry(id="gd", name="Guinness Draught", brewery="Guinness"),
    CatalogEntry(id="lm", name="Lagunitas IPA", brewery="Lagunitas"),
    CatalogEntry(id="sn", name="Sierra Nevada Pale Ale", brewery="Sierra Nevada"),
]

# Lines exactly as the vision model would return them from the photographed board.
MENU_LINES = [
    "BrewDog Punk IPA",  # brewery+name, matches "Punk IPA"
    "Dead Pony Club Pale Ale",  # trailing style, matches "Dead Pony Club"
    "Guinness Draught",  # exact
    "Lagunitas IPA",  # exact
    "Tuborg Green",  # on the board, not in our catalog
]


def _llm(names: list[str]) -> AsyncMock:
    mock = AsyncMock()
    mock.extract_beer_names.return_value = names
    return mock


@pytest.mark.asyncio
async def test_real_menu_photo_scan():
    results = await scan_menu("photo_base64", CATALOG, _llm(MENU_LINES))

    by_text = {r.raw_text: r for r in results}
    matched = {r.raw_text: r.match.id for r in results if r.match}

    # The four catalog beers are found despite brewery prefixes / style suffixes.
    assert matched["BrewDog Punk IPA"] == "pt"
    assert matched["Dead Pony Club Pale Ale"] == "dm"
    assert matched["Guinness Draught"] == "gd"
    assert matched["Lagunitas IPA"] == "lm"

    # Exact hits are confident; the noisy lines are flagged for confirmation.
    assert by_text["Guinness Draught"].needs_review is False
    assert by_text["Dead Pony Club Pale Ale"].needs_review is True

    # A beer on the board we don't carry is surfaced, unmatched, for review.
    off_catalog = by_text["Tuborg Green"]
    assert off_catalog.match is None
    assert off_catalog.needs_review is True
