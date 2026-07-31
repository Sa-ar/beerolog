from app.services.fuzzy_matcher import CatalogEntry, fuzzy_match

GUINNESS = CatalogEntry(id="1", name="Guinness Draught", brewery="Guinness")
HEINEKEN = CatalogEntry(id="2", name="Heineken", brewery="Heineken")
CATALOG = [GUINNESS, HEINEKEN]


def test_exact_name_match_scores_1():
    results = fuzzy_match("Guinness Draught", CATALOG)
    assert len(results) == 1
    assert results[0].entry.id == "1"
    assert results[0].score == 1.0


def test_case_insensitive_match():
    results = fuzzy_match("guinness draught", CATALOG)
    assert len(results) == 1
    assert results[0].entry.id == "1"
    assert results[0].score >= 0.95


def test_typo_still_matches_above_threshold():
    # 'Guiness Draught' is missing one 'n'
    results = fuzzy_match("Guiness Draught", CATALOG, threshold=0.6)
    assert len(results) >= 1
    assert results[0].entry.id == "1"
    assert results[0].score >= 0.6


def test_brewery_name_combo_matches():
    sierra = CatalogEntry(id="3", name="Pale Ale", brewery="Sierra Nevada")
    results = fuzzy_match("Sierra Nevada Pale Ale", [sierra], threshold=0.6)
    assert len(results) == 1
    assert results[0].matched_on == "brewery+name"


def test_unrelated_name_filtered_out():
    results = fuzzy_match("xyzzy quantum flux", CATALOG, threshold=0.6)
    assert results == []


def test_empty_catalog_returns_empty():
    assert fuzzy_match("Guinness Draught", [], threshold=0.6) == []


def test_truncated_name_matches_via_containment():
    salted = CatalogEntry(
        id="schnitt-porter-sons-salted-caramel",
        name="Porter & Sons Salted Caramel",
        brewery="Schnitt",
    )
    results = fuzzy_match("Salted Caramel", [salted], threshold=0.85)
    assert len(results) == 1
    assert results[0].entry.id == salted.id
    assert results[0].score >= 0.85
    assert results[0].matched_on == "containment"


def test_ocr_repeated_tokens_match_what_was_was():
    entry = CatalogEntry(id="schnitt-what-was-was", name="What Was Was", brewery="Schnitt")
    results = fuzzy_match("WHAT WAS WAS WAS", [entry], threshold=0.85)
    assert len(results) == 1
    assert results[0].entry.id == entry.id
    assert results[0].score >= 0.85


def test_guest_prefix_omitted_hobgoblin():
    entry = CatalogEntry(
        id="wychwood-hobgoblin-stout",
        name="Wychwood Hobgoblin Stout",
        brewery="Wychwood",
    )
    results = fuzzy_match("Hobgoblin Stout", [entry], threshold=0.85)
    assert len(results) == 1
    assert results[0].entry.id == entry.id
    assert results[0].score >= 0.85
