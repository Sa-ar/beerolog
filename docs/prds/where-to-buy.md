# PRD: Where to buy this beer

- Status: Draft
- Type: enhancement
- Current intended status: ready-for-human
- Related: [ADR-0006](../adr/0006-availability-signal-log.md); CONTEXT.md terms `Venue`, `Availability`, `AvailabilityReport`
- Builds on: shipped slice 1 (`venues` + `beer_availability` tables, `POST /availability`, curated seed `pnpm db:seed:venues`, maps-link fallback)

## Problem Statement

A user gets beer recommendations but doesn't know where to actually get them. The feedback came
twice: "where can I buy this?" The current answer is a Google Maps link — a guess, not knowledge.
The app knows *what* to drink but nothing about *where* to obtain it, so the recommendation stops
short of being actionable.

## Solution

For each recommended `Beer`, show the `Venue`s that **generally carry** it — bottle shops and pubs,
located by city/area — with an honest freshness signal. The data is sourced two ways that
reinforce each other: the **base layer** is a weekly scrape of the venues' own public online
retailer/delivery catalogs — i.e. what each place publicly lists it carries — and on top of that a
Waze-style report loop where signed-in users confirm ("still here"), deny ("gone"), or add a place.
Scraped records are shown as based on the venue's public listing.
When we have no confident records for a beer, we fall back to the existing maps link, so the
feature never shows worse than today.

Freshness is not a stored flag but a **confidence recomputed from an append-only log of signals**
(scrapes + user reports), time-decayed over a ~90-day half-life (ADR-0006). Users may optionally
filter recommendations to "only beers I can get near [area]"; by default the taste-only matcher is
untouched.

## User Stories

1. As a recommendation viewer, I want to see which shops and pubs generally carry a recommended beer, so that I can actually go get it.
2. As a recommendation viewer, I want venues shown for my city/area, so that the results are relevant to where I am.
3. As a recommendation viewer, I want to know how recently a venue was confirmed to carry the beer, so that I can judge how much to trust it.
4. As a recommendation viewer, I want the most-confident venues listed first, so that I try the best bets before the stale ones.
5. As a recommendation viewer with no records for a beer, I want a "find it near me" maps link instead, so that I'm never left with a dead end.
6. As a recommendation viewer, I want to distinguish a bottle shop from a pub, so that I pick the kind of place I want (take home vs drink out).
7. As a signed-in user, I want to confirm "still here" on a venue, so that I keep good records fresh for others.
8. As a signed-in user, I want to report "gone" when a venue no longer carries a beer, so that others aren't sent on a wasted trip.
9. As a signed-in user, I want to add a place I know carries a beer, so that coverage grows beyond what we scraped.
10. As a signed-in user adding a place, I want the app to suggest venues that already exist, so that I don't create a duplicate.
11. As a guest (not signed in), I want to still see availability and the maps link, so that I get value without an account, even though I can't report.
12. As a user, I want my single report not to instantly flip a record, so that one mistaken tap doesn't mislead everyone — confidence moves proportionally.
13. As a user, I want a venue I marked "gone" to come back if the scraper keeps seeing it, so that the system self-corrects against my error.
14. As a user, I want to optionally filter recommendations to beers available near me, so that I only see what I can actually buy tonight.
15. As a user who turns on "near me" and gets nothing, I want a clear empty-state with the option to widen the area or turn the filter off, so that I'm not stuck on a blank screen.
16. As a user, I do not want availability to silently reorder or hide my best taste matches by default, so that recommendation quality stays trustworthy.
17. As an operator, I want a weekly job that refreshes availability from public catalogs, so that the data ages gracefully without manual effort.
18. As an operator, I want a scraped product that no longer appears at a venue to lower that record's confidence, so that dropped stock fades automatically.
19. As an operator, I want a failed scrape fetch to record no signal at all, so that an outage doesn't look like "the beer is gone everywhere."
20. As an operator, I want scraped product names matched to our catalog automatically, with an ambiguous-match review queue, so that I only hand-judge the uncertain cases.
21. As an operator, I want products that match no catalog beer to be dropped, so that availability stays scoped to beers we actually recommend.
22. As an operator, I want venues deduped across sources and re-scrapes via source ids and fuzzy matching, so that one physical place is one record.
23. As an operator, I want each chain branch treated as its own venue, so that area filtering points users to the right address.
24. As an operator, I want to retune the decay half-life, signal weights, and display threshold without a data migration, so that I can calibrate the system as it runs.
25. As an operator, I want to upgrade from flat trust to reputation-based weighting later without migrating data, so that the trust model can mature.
26. As an operator, I want abuse guards (one active report per user per record, rate limits, cooldown), so that the report loop resists spam and brigading.
27. As an operator, I want user-added venues to publish at low confidence and be reviewable after the fact, so that the crowd loop stays low-friction but moderatable.
28. As an operator, I want unconfirmed user-adds to decay away on their own, so that junk doesn't require active cleanup.
29. As an operator, I want to flag and review suspicious user-added content, so that I can remove spam venues.
30. As an operator, I want every availability value to be traceable to its underlying signals, so that I can debug why a record shows what it does.
31. As a site owner, I want scraping to honor robots.txt, rate limits, and an identifying UA, with stored source + fetch time, so that we are good citizens and can honor opt-outs.
32. As a user, I want scraped availability labelled as based on what the venue lists publicly, so that I understand the base data comes from the places' own public listings.

## Implementation Decisions

### Domain model & schema

- `Venue` (extends shipped table): keep slug PK + name/name_hebrew/type/city/area/address/url; ADD nullable source-id columns `wolt_id`, `google_place_id`, `untappd_id` as dedup keys (unique where present). One row per physical branch.
- `Availability` (the (beer, venue) pairing) becomes **derived**, not authoritative. Source of truth is the signal log; a materialized confidence cache backs reads.
- NEW `availability_signal` (append-only log): `id`, `beer_id`, `venue_id`, `kind` (`scrape_seen` | `scrape_absent` | `user_confirm` | `user_deny` | `user_add`), `weight` (real), `actor` (`scrape:<source>` | `user:<id>`), `source_url`, `observed_at`. Never updated, only inserted.
- NEW materialized read cache (table or matview) keyed by `(beer_id, venue_id)`: `confidence`, `last_confirmed_at`, `recomputed_at`. Refreshed after report writes and after each scrape run.
- NEW `availability_match_review` queue: ambiguous scrape→catalog matches (0.80–0.92) awaiting human judgment.
- Migrations via drizzle-kit (`pnpm db:generate`). The shipped `beer_availability` table is superseded by the signal log + cache; slice 1's curated rows are backfilled as `user_add`/`scrape_seen` signals.

### Module: confidence computation (deep, pure, Python) — TESTED

- Interface: `compute(signals, params, now) -> { confidence, last_confirmed_at, visible }`.
- `confidence = Σ weightᵢ · 0.5^((now − observed_atᵢ)/halfLife)`; `last_confirmed_at` = newest positive signal; `visible = confidence ≥ threshold`.
- `params` (config, not schema): `halfLife ≈ 90d`, per-kind base weights (scrape signals outweigh a single user report), `threshold`. Tunable → a recompute, never a migration.
- No I/O. The crown jewel of ADR-0006; everything else feeds it.

### Module: entity-resolution classifier (deep, pure) — TESTED

- Interface: `classify(normalizedName, productEmbedding, catalog, thresholds) -> { link: beerId } | { review } | { drop }`.
- Normalize (lowercase, strip volume/units, fold Hebrew/English variants) + reuse `BeerEmbedding` cosine vs catalog. `≥ 0.92 → link`, `0.80–0.92 → review`, `< 0.80 or no match → drop`.
- Embedding generation injected (calls the existing embedding service); the classifier itself is pure given vectors.

### Module: venue-identity resolver (deep, pure) — TESTED

- Interface: `resolve(scrapedVenue, candidates) -> { match: venueId } | { new } | { review }`.
- Match by external source id first; else fuzzy on name + city + area. Candidate lookup injected.
- Same resolver powers user-add dedup suggestions (`new` near-misses surface as "did you mean?").

### Module: report abuse-guard (deep, pure) — TESTED

- Interface: `evaluate(existingReports, newReport, clock) -> { accept } | { reject: reason }`.
- Rules: one active report per `(user, availability)`; per-user rate limit; cooldown before re-reporting the same record. v1 trust weight = 1.0 for all authed reports.

### Module: near-me filter (deep, pure) — TESTED

- Interface: `filter(rankedBeers, availabilityByBeer, area) -> { beers, empty }`.
- Keeps only beers with a visible (above-threshold) availability whose venue matches the area. Default off; matcher output is the unfiltered input. `empty` drives the empty-state UI.

### I/O supports (thin; integration/manual coverage)

- **Signal-log repo** (Python): append signals; fetch signals (or cached confidence) for `(beer_ids, area)`; recompute + refresh cache. `POST /availability` reads the cache + applies the confidence module's visibility/sort.
- **Report API** (FastAPI): `POST /availability/reports` (authed) → abuse-guard → append `user_confirm|user_deny|user_add` signal → refresh affected cache rows. `add` runs venue-identity resolver; new venues publish at low confidence.
- **Scraper pipeline** (Python, per-source adapters): weekly cron per source → fetch (robots.txt, rate-limit, UA, store `source_url`+`fetched_at`) → parse → venue-identity + entity-resolution → append `scrape_seen`; a previously-seen pairing absent from a *successful* venue scrape → `scrape_absent`; fetch failure → no signal. Idempotent.
- **Web** (TanStack Start): extend the recommendation card — show confident venues (sorted) with `last_confirmed_at`, else the maps fallback; add confirm/deny/add controls for signed-in users (guests read-only). Add the opt-in "near me" filter + empty-state. Reuse the existing `searchArea` input + `lib/beer-availability.ts` fetch.

### API contracts

- `POST /availability` (exists): response per venue gains `confidence`, `last_confirmed_at`, `type`; results pre-sorted, pre-filtered to visible.
- `POST /availability/reports` (new, authed): `{ beer_id, venue_id?, kind, venue?: {name,type,city,area,address?} }` → `{ accepted, reason? }`.

## Testing Decisions

Good tests assert **external behavior, not implementation**: feed a module its inputs and assert the
returned decision/number, never its internals. The five pure modules are tested as isolated units
(no DB, no network, no fixtures) — this is exactly why they were carved out pure:

- **Confidence**: decay halves a signal's contribution after one half-life; positive + negative signals sum; a fresh `scrape_seen` outweighs one stale `user_deny`; `visible` flips at the threshold; `last_confirmed_at` ignores negative signals.
- **Entity-resolution classifier**: `≥ 0.92 → link`, mid-band → `review`, below/no-match → `drop`; Hebrew/English + volume-suffix variants normalize to the same key.
- **Venue-identity resolver**: external-id hit → `match`; no id + close name/area → `match`/`review`; distinct branch → `new`.
- **Report abuse-guard**: second active report from same user → `reject`; report within cooldown → `reject`; fresh authed report → `accept`.
- **Near-me filter**: out-of-area / below-threshold venues excluded; all-excluded → `empty: true`.

Prior art: pure-logic vitest suites in `apps/web/src/lib/*.test.ts` (e.g. `beer-store-search.test.ts`,
`onboarding-quiz` logic, `match-score`) and the Python matcher's `match_engine`/`abv_band` units.
The report→signal→confidence DB round-trip is left to integration/manual verification (out of the
unit scope chosen here).

## Out of Scope

- Live/real-time stock counts (would need POS/distributor integration — see ADR-0006).
- Coordinate/geocoded location and distance sorting (area-text only).
- Behavioral reputation / per-user accuracy weighting (designed-for, not built; later = pure recompute).
- Availability-boosted *ranking* (only the opt-in post-rank filter ships; matcher stays taste-only).
- Pub/on-premise source ingestion (Untappd menus) — v1 backbone is shop catalogs; pubs land later.
- Prices, promotions, delivery/ordering integration.
- Catalog expansion from scraped non-catalog products (dropped here; separate pipeline).
- Pre-publication moderation (user-adds auto-publish low-confidence; review is retroactive).

## Further Notes

**Open parameters to settle during execution** (config, not blockers):

- Exact source list + per-source adapters (start with one shop source end-to-end).
- Similarity thresholds (0.92 / 0.80 are starting points).
- Per-kind signal weights, half-life, display threshold, cooldown/rate-limit values.
- Cron infra location (where the weekly job runs) — confirm against current deploy (web on Vercel; API host TBD).

**Sourcing posture:** the base scrape is **public data the venues display themselves** (their public
catalogs). It is the foundation of our dataset, not a separately-disclosed or gated activity. Apply
ordinary good-citizen hygiene (robots.txt, rate limits, identifying UA, stored `source_url` +
`fetched_at`, honor opt-outs) and show users that scraped records are based on the venue's public
listing. No external disclosure or pre-launch legal gate.

**Build order (vertical slices for `/to-issues`):**

1. Signal log + recomputable confidence + materialized cache (refactor slice-1 flat join; backfill curated rows as signals). *Foundational substrate.*
2. Scraper pipeline for one shop source (the public-data base layer) + provenance display. *Base data.*
3. Confirm/deny reports + abuse-guard. *Waze refinement on the base.*
4. Add-a-place (venue-identity dedup, low-confidence publish).
5. Weekly cron scheduling of the scraper (infra decision — HITL).
6. "Near me" opt-in filter + empty-state.
7. Retro-moderation (flagging/review).
8. Signal compaction.
