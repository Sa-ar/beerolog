from app.services.fuzzy_matcher import CatalogEntry, fuzzy_match

GUINNESS = CatalogEntry(id='1', name='Guinness Draught', brewery='Guinness')
HEINEKEN = CatalogEntry(id='2', name='Heineken', brewery='Heineken')
CATALOG = [GUINNESS, HEINEKEN]


def test_exact_name_match_scores_1():
    results = fuzzy_match('Guinness Draught', CATALOG)
    assert len(results) == 1
    assert results[0].entry.id == '1'
    assert results[0].score == 1.0


def test_case_insensitive_match():
    results = fuzzy_match('guinness draught', CATALOG)
    assert len(results) == 1
    assert results[0].entry.id == '1'
    assert results[0].score >= 0.95


def test_typo_still_matches_above_threshold():
    # 'Guiness Draught' is missing one 'n'
    results = fuzzy_match('Guiness Draught', CATALOG, threshold=0.6)
    assert len(results) >= 1
    assert results[0].entry.id == '1'
    assert results[0].score >= 0.6


def test_brewery_name_combo_matches():
    sierra = CatalogEntry(id='3', name='Pale Ale', brewery='Sierra Nevada')
    results = fuzzy_match('Sierra Nevada Pale Ale', [sierra], threshold=0.6)
    assert len(results) == 1
    assert results[0].matched_on == 'brewery+name'


def test_unrelated_name_filtered_out():
    results = fuzzy_match('xyzzy quantum flux', CATALOG, threshold=0.6)
    assert results == []


def test_empty_catalog_returns_empty():
    assert fuzzy_match('Guinness Draught', [], threshold=0.6) == []
