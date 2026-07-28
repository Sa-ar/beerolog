# ADR 0008: Shared catalog with market tags and LLM enrichment pipeline

- Status: Accepted
- Date: 2026-07-24

## Decision

Maintain a **single global product catalog** (beers, cocktails, spirits, food) shared across all
markets and white-label tenants. Market availability is expressed through a `beer_market_availability`
join table — a beer exists once in the catalog and is tagged to the markets where it is available.
Recommendations are always filtered to the user's active market.

Catalog attribute enrichment uses a **waterfall LLM pipeline** triggered when bar staff submit a
new menu item by name:

1. **Fuzzy match** against existing catalog — if the item already exists, re-use it (dedup).
2. **LLM lookup** (GPT-4o) — use the model's training knowledge of the specific beer to fill
   structured attributes: ABV, IBU, style, body, bitterness, color, tasting notes.
3. **BJCP style-level priors** — if LLM confidence is low or the beer is obscure, fall back to
   the BJCP 2021 style guidelines (published as JSON, freely usable) to seed sensible attribute
   ranges from the identified style.
4. **Staff confirmation** — the submitting bar staff member sees the auto-filled attributes and
   can correct them before the item publishes to the catalog.

No scraping of ToS-protected sources (Untappd, RateBeer) is permitted at any stage.

**v1 scope:** beer only. `CatalogItem` category field (`beer` | `cocktail` | `spirit` | `food`)
is in the schema from day one but non-beer categories are unpopulated until the staff portal
feature ships. Food pairing (beer → food) is a v2 feature built on the same `CatalogItem` model.

## Context

The initial catalog was hand-seeded for the Israeli market. As Beerolog expands to white-label
tenants and eventually multiple countries, two approaches were considered:

- **Per-market catalogs** — each market/tenant gets its own isolated catalog table or schema.
  Clean isolation, but no cross-market data sharing, duplicate infrastructure per market, and
  no network effects on ratings or pairing data.
- **Shared catalog + market tags** — one canonical record per product, availability expressed as
  a join. Cross-market data sharing is possible (a beer rated in IL informs recommendations in
  DE if the beer is available there), travel recommendations become possible ("you're in Berlin,
  here's what to try"), and catalog enrichment effort is spent once per product, not once per market.

The key insight enabling the shared catalog is the white-label staff portal: **bar staff are the
primary catalog data entry layer**. When a Berlin bar adds "Weihenstephaner Hefeweizen," that beer
is enriched once and tagged to the DE market — it does not need to be hand-seeded by the Beerolog
team. The catalog grows with the network.

Hand-seeding the full catalog for each new country is not viable at scale. The LLM enrichment
waterfall eliminates this bottleneck: GPT-4o reliably knows ABV, style, and flavor profile for
most commercial beers worldwide, making LLM enrichment fast and accurate for well-known beers.
BJCP style priors provide a safe fallback for obscure or regional beers. Staff correction
closes the remaining gap and provides first-party validation.

## Consequences

- **Schema**: `beers` table gains a canonical `brewery_country` and loses Israeli-specific
  `market_tier` assumptions. A `markets` table and `beer_market_availability` join table are
  added. `market_tier` becomes a per-market attribute on the join, not a global field.
- **Enrichment service**: A new async job fires on every new catalog submission, calling the
  LLM waterfall and writing structured attributes back to the `beers` row before it publishes.
- **Data sources**: BJCP 2021 style guidelines (JSON, freely usable) are ingested as a static
  reference dataset to seed style-level attribute ranges. No paid or ToS-restricted data sources
  are used at ingestion time.
- **Non-beer categories deferred**: The `CatalogItem` generalisation (cocktails, spirits, food)
  is schema-ready but data-empty until the staff portal ships. This avoids premature abstraction
  while keeping the path open.
- **Food pairing is a v2 feature**: Beer → food pairing relationships are modelled as
  `FoodPairing` records (beer `CatalogItem` ↔ food `CatalogItem`). Not built in v1. Beer →
  cocktail / wine pairing is deferred until a non-beer flavor catalog with structured attributes
  exists — style priors alone are insufficient for cross-category recommendation quality.

## Alternatives considered

- **Per-market catalogs**: Rejected — no cross-market network effects, duplicates all catalog
  enrichment work, makes travel recommendations impossible.
- **Untappd / RateBeer scraping for bulk enrichment**: Rejected — ToS violation, legal and
  reputational risk. LLM + BJCP priors + staff input provides equivalent quality legally.
- **Manual seeding per market**: Rejected — does not scale past one or two markets without a
  dedicated data team. The white-label staff portal as the data entry layer is the only
  sustainable model.
