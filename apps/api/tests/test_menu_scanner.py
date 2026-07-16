from unittest.mock import AsyncMock

import pytest

from app.services.fuzzy_matcher import CatalogEntry
from app.services.menu_scanner import scan_menu

GUINNESS = CatalogEntry(id="1", name="Guinness Draught", brewery="Guinness")
HEINEKEN = CatalogEntry(id="2", name="Heineken", brewery="Heineken")
CATALOG = [GUINNESS, HEINEKEN]


def make_llm(names: list[str]) -> AsyncMock:
    """LLM client stub that returns a fixed list of extracted beer names."""
    mock = AsyncMock()
    mock.extract_beer_names.return_value = names
    return mock


@pytest.mark.asyncio
async def test_extracts_beer_names_and_matches_catalog():
    llm = make_llm(["Guinness Draught", "Heineken"])
    results = await scan_menu("base64img", CATALOG, llm)

    assert len(results) == 2
    matched_ids = {r.match.id for r in results if r.match}
    assert "1" in matched_ids
    assert "2" in matched_ids


@pytest.mark.asyncio
async def test_unmatched_name_returns_result_with_no_match():
    llm = make_llm(["Xtreme Unobtanium Stout"])
    results = await scan_menu("base64img", CATALOG, llm)

    assert len(results) == 1
    assert results[0].match is None
    assert results[0].needs_review is True
    assert results[0].raw_text == "Xtreme Unobtanium Stout"


@pytest.mark.asyncio
async def test_low_confidence_match_flagged_for_review():
    # 'Ginnuss' is a typo of 'Guinness Draught' — should match but with low confidence
    llm = make_llm(["Ginnuss"])
    results = await scan_menu("base64img", CATALOG, llm)

    assert len(results) == 1
    assert results[0].needs_review is True


@pytest.mark.asyncio
async def test_high_confidence_match_not_flagged_for_review():
    llm = make_llm(["Heineken"])
    results = await scan_menu("base64img", CATALOG, llm)

    assert len(results) == 1
    assert results[0].needs_review is False


@pytest.mark.asyncio
async def test_empty_llm_response_returns_empty_list():
    llm = make_llm([])
    results = await scan_menu("base64img", CATALOG, llm)

    assert results == []
