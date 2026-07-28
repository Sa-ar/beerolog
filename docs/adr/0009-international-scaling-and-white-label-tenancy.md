# ADR 0009: International scaling architecture and white-label multi-tenancy

- Status: Accepted (seams in now; full multi-market operations deferred)
- Date: 2026-07-24

## Decision

Design the data model and configuration layer to support multiple markets and white-label tenants
from the start, even though Beerolog launches in a single market (Israel). The goal is that
expanding to a new country is a **data and config problem**, not an engineering rewrite.

### What is built in now (v1 seams)

- `markets` table: `{ id, country_code, name, default_locale, age_gate_min_age, supported_locales[] }`
- `beer_market_availability` join: `{ beer_id, market_id, market_tier }` — replaces the
  global `market_tier` field on `beers` with a per-market field on the join
- `white_label_tenants` table: `{ id, market_id, slug, branding_config jsonb }` — bar/venue
  running Beerolog under their own brand; scoped to a market
- Per-market config (payment processor, legal page URLs, age gate rules, supported locales)
  lives in application config keyed by `market_id`, not hardcoded

### What is deferred

- Multiple live markets in production
- Per-market payment processor integration (Stripe is global; local processors are per-country config)
- Per-market legal and compliance pages (terms, privacy, cookie consent — authored per jurisdiction)
- Per-market locale copy beyond `en` and `he`
- Tenant branding UI (custom logo, colors, domain)
- B2B bar intelligence and predictive analytics (see deferred surfaces in `CONTEXT.md`)

### What transfers globally without change

The following components work against any catalog in any locale without modification:

- `BaselineTaste` architecture and embedding model (abstract flavor vectors are language/market-agnostic)
- Recommendation engine (`Match`, novelty re-rank, `SessionIntent`)
- Rating feedback loop
- Menu scan (OCR + fuzzy match works in any language)
- `OnboardingQuiz` structure (may need cultural tuning of specific proxy questions per market)
- LLM why-line pipeline (locale-aware already via `en`/`he` prompt parameter — add locales as needed)
- i18n infrastructure (add locale, add translation strings)

## Context

### The scaling constraint

The recommendation engine and taste architecture are market-agnostic. The hard constraints on
international expansion are:

1. **Catalog data is market-local** — solved by ADR 0008 (shared catalog + market tags, crowdsourced
   via the white-label staff portal).
2. **Venue data is hyper-local** — the availability signal system (ADR 0006) architecture generalises;
   the data must be seeded or crowdsourced per market.
3. **Compliance is per-jurisdiction** — age gate rules, privacy law, alcohol regulations, VAT/tax
   invoicing, and accessibility standards vary by country. These are config/content problems, not
   architectural ones, but they must be present before a market goes live.
4. **Payments are per-country** — Stripe handles most international markets; local processors
   (Cardcom/Tranzila in Israel) are config, not code.

### The data flywheel

The B2B intelligence value proposition compounds with network scale:

- More users → richer taste profiles per bar
- More bars → more order and rating data per market
- More markets → cross-market benchmarks and trend signals
- Better predictions → bars stock better → better user experience → more users

This flywheel only becomes meaningful at scale (~10+ active partner bars with order data). The
seam architecture ensures the flywheel infrastructure exists when the network reaches that threshold,
without prematurely building the analytics layer.

### Taste profile portability across tenants

**Resolved (2026-07-25, OD-001)**: White-label bars use **cold start** — users complete a short
re-quiz (~30 seconds) at each venue. No cross-tenant profile portability in v1.

Rationale: the B2C app has limited traction, so there is no meaningful existing user base whose
profiles are worth carrying across venues. The schema supports all three options (shared identity,
anonymous vector token, cold start) without change. Portability will be revisited once 2+ active
white-label bars exist and cross-venue user overlap can be measured.

### International expansion strategy

International expansion is driven by the white-label B2B model, not by Beerolog directly entering
new markets. When a bar in a new country licenses the white-label product, they:

1. Seed the local catalog via the staff portal (beer and food menu entry + LLM enrichment)
2. Serve as the initial availability and taste-signal data source for that market
3. Bring the product to local users without Beerolog needing to build a local user base first

This means **a new white-label bar partner is simultaneously a catalog seed operation and a
market-entry event**. The `markets` and `beer_market_availability` schema supports this natively —
adding a new market is a data and config problem, not an engineering rewrite (see Decision above).

Per-market compliance (age gate rules, privacy law, payment processors, locale copy) must be
complete before any white-label bar in that market goes live. That work is deferred until the
first non-Israeli partner is contracted.

### Non-beer catalog item sequencing

The `CatalogItem` schema supports `beer`, `food`, `cocktail`, and `spirit` categories from day
one (ADR 0008). The activation sequence is:

1. **Food** — ships with the staff portal v1. Bars enter their food menu; LLM enrichment
   auto-generates `FoodPairing` records. (Decided 2026-07-25, OD-004.)
2. **Cocktails and spirits** — deferred until after food pairing is stable. The same staff portal
   entry flow and enrichment pipeline apply; no new architecture needed. Activation is a product
   and data decision, not an engineering one.

Beer → cocktail / wine cross-category pairings remain deferred until a non-beer flavor catalog
exists with enough coverage to produce useful matches.

## Consequences

- **Schema**: `markets` and `white_label_tenants` tables added in v1, even with one row each.
  `beer_market_availability` replaces the global `market_tier` on `beers`. All recommendation
  queries gain a `market_id` filter clause.
- **Config**: A `markets.config.ts` (or equivalent) defines per-market settings. Checked at
  startup; adding a new market is a config file change + data seeding, not a code change.
- **No multi-tenancy isolation yet**: v1 white-label tenants share the same Postgres instance
  and application deployment. Row-level isolation via `tenant_id` is sufficient at this scale.
  Separate deployments per tenant are a future option, not a v1 requirement.
- **Locale strategy**: LLM why-lines and personas already support `en`/`he`. Adding a new locale
  requires: (1) translation strings for UI copy, (2) LLM prompt adjustment for tone/register,
  (3) potentially cultural tuning of quiz proxy questions. Each is independent work.
- **ADR 0001 boundary preserved**: white-label and multi-market are not launch requirements.
  This ADR documents the seam design only.

## Alternatives considered

- **Per-market databases**: Cleanest isolation, but no cross-market intelligence, duplicated
  infrastructure cost, and migration complexity if a beer appears in multiple markets. Rejected.
- **Build multi-tenancy later**: Retrofitting `market_id` after two markets are live with
  existing data is a painful migration. The seam cost now is two tables and a join. Rejected.
- **Single global market assumption**: Locks in Israeli-specific logic (`market_tier` as a
  global field, age gate hardcoded to 18-IL, Hebrew as default). Already partially true — this
  ADR exists to formally reverse those assumptions before they calcify further.
