"""Hand-seeded 10-beer placeholder catalog for slice #74 smoke test.

Real scrape pipeline replaces this in slice #75. Embeddings are intentionally
hand-tuned 8-D vectors (not 1536-D) so the smoke test runs without an
OpenAI API call — the production wiring uses real 1536-D embeddings.

Layout (axis index → meaning):
  0 bubbles / lightness        4 fruity
  1 bitterness / hop intensity 5 sour
  2 malty / body               6 smoky
  3 roasty                     7 novelty-flavor
"""

from __future__ import annotations

from app.services.match_engine import BeerCandidate

PLACEHOLDER_CATALOG: list[BeerCandidate] = [
    BeerCandidate(
        id="goldstar",
        name="Goldstar Lager",
        brewery="Tempo",
        style="Amber Lager",
        abv=4.9,
        market_tier="mainstream",
        image_url=None,
        adventurousness=0.05,
        embedding=[0.7, 0.3, 0.5, 0.2, 0.1, 0.0, 0.0, 0.05],
    ),
    BeerCandidate(
        id="maccabee",
        name="Maccabee Premium Lager",
        brewery="Tempo",
        style="Pale Lager",
        abv=4.9,
        market_tier="mainstream",
        image_url=None,
        adventurousness=0.05,
        embedding=[0.8, 0.2, 0.4, 0.05, 0.05, 0.0, 0.0, 0.05],
    ),
    BeerCandidate(
        id="alexander-blazer",
        name="Alexander Blazer",
        brewery="Alexander",
        style="American IPA",
        abv=6.2,
        market_tier="craft",
        image_url=None,
        adventurousness=0.55,
        embedding=[0.4, 0.85, 0.3, 0.05, 0.7, 0.0, 0.0, 0.5],
    ),
    BeerCandidate(
        id="alexander-green",
        name="Alexander Green",
        brewery="Alexander",
        style="Pale Ale",
        abv=5.2,
        market_tier="craft",
        image_url=None,
        adventurousness=0.35,
        embedding=[0.5, 0.6, 0.4, 0.1, 0.6, 0.05, 0.0, 0.35],
    ),
    BeerCandidate(
        id="malka-stout",
        name="Malka Stout",
        brewery="Malka",
        style="Stout",
        abv=6.0,
        market_tier="craft",
        image_url=None,
        adventurousness=0.55,
        embedding=[0.2, 0.55, 0.6, 0.85, 0.1, 0.0, 0.2, 0.5],
    ),
    BeerCandidate(
        id="herzl-saison",
        name="Herzl Saison",
        brewery="Herzl",
        style="Saison",
        abv=6.5,
        market_tier="craft",
        image_url=None,
        adventurousness=0.7,
        embedding=[0.55, 0.5, 0.3, 0.05, 0.65, 0.4, 0.0, 0.7],
    ),
    BeerCandidate(
        id="beerbazaar-gose",
        name="BeerBazaar Gose",
        brewery="BeerBazaar",
        style="Gose",
        abv=4.5,
        market_tier="craft",
        image_url=None,
        adventurousness=0.8,
        embedding=[0.7, 0.3, 0.2, 0.05, 0.5, 0.85, 0.0, 0.75],
    ),
    BeerCandidate(
        id="schnitt-pale",
        name="Schnitt House Pale",
        brewery="Schnitt",
        style="Pale Ale",
        abv=5.4,
        market_tier="craft",
        image_url=None,
        adventurousness=0.5,
        embedding=[0.5, 0.65, 0.35, 0.1, 0.6, 0.05, 0.0, 0.55],
    ),
    BeerCandidate(
        id="hoegaarden",
        name="Hoegaarden Witbier",
        brewery="Hoegaarden",
        style="Witbier",
        abv=4.9,
        market_tier="import",
        image_url=None,
        adventurousness=0.25,
        embedding=[0.75, 0.25, 0.45, 0.05, 0.6, 0.15, 0.0, 0.25],
    ),
    BeerCandidate(
        id="guinness",
        name="Guinness Draught",
        brewery="Guinness",
        style="Irish Stout",
        abv=4.2,
        market_tier="import",
        image_url=None,
        adventurousness=0.3,
        embedding=[0.3, 0.5, 0.55, 0.85, 0.1, 0.0, 0.15, 0.3],
    ),
]
