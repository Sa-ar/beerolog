# PRD: White-Label Platform (umbrella)

**Status:** Draft
**Date:** 2026-07-28
**Extends:** `docs/prds/staff-portal.md` (Phase A execution), ADR 0009, ADR 0010, ADR 0012
**Supersedes:** `docs/prds/bar-partner-tooling.md` (ordering scope — see ADR 0012; operator surface — Phase D)

---

## Problem Statement

Beerolog's primary business is paid white-label B2B: bars license the
recommendation engine under their own brand. The staff portal PRD and slices
(#295–#306) cover the bar-side workspace, but the offering as a whole — what a
bar actually buys and what its customers experience — has never been written
down end to end. Meanwhile the owner has made a scope-changing decision:
**full in-app ordering with payments is in scope as an optional per-bar
module**, reversing `bar-partner-tooling.md`'s documented out-of-scope.

This PRD is the umbrella: the six-goal vision, the surface composition, the
unified tenant model, and the phase map (A–D) that sequences everything from
the already-sliced staff portal through ordering, outcome measurement, and
predictive supply recommendations.

## Goals

The white-label platform is **the** way for a bar to run:

1. **Digital menu** — a live, staff-managed tap list that doubles as the
   consumer-facing menu (no photo scan needed at managed venues).
2. **In-app ordering with payments** — optional per-bar module: native cart +
   staff live-orders screen, or dispatch to the bar's existing POS/ordering
   service, with payment through the bar's own merchant account (ADR 0012).
3. **Data aggregation** — demand signals, taste distributions, and outcome
   data the bar cannot get anywhere else, always aggregate and anonymised
   (ADR 0010, k-anonymity floor per OD-007).
4. **Decision-fatigue help for customers** — the menu-scoped swipe deck with
   match % and per-beer why-lines, branded for the venue.
5. **Fewer returned drinks / wasted tasters** — measure outcomes
   ("was it what you expected?") per served order, surface return rates to the
   bar, and suggest taster flights to low-confidence customers.
6. **Predictive analytics with supply recommendations** — "your area skews
   hop-forward — consider stocking Y", grounded in area taste aggregates and
   the venue's actual menu.

## Surface composition

Three surfaces, one API, one DB:

- **Consumer** (`apps/web`): QR → `/v/$venueSlug` → tenant-branded,
  menu-scoped What-I-Want deck (existing swipe machinery) → cart/order → pay →
  rate + outcome.
- **Staff portal** (`apps/portal`, admin.beerolog.com): tap list, live orders,
  invites/roles, analytics, supply recommendations. See
  `docs/prds/staff-portal.md`.
- **Operator console**: deferred to Phase D, per
  `docs/prds/bar-partner-tooling.md`.

Consumer identity in-venue follows OD-001: cold-start inline quiz per venue;
guests use the existing `guest_recommendations` + `guest_embedding_cache` path
with a client-minted `session_token` (no PII).

## Unified tenant model

Resolves the ADR 0009 ↔ staff-portal PRD mismatch (see ADR 0009 addendum,
2026-07-28):

- **`organizations` ARE the tenants** — there is no separate
  `white_label_tenants` table. An org carries `market_id`, `branding_config`
  (jsonb), and `status` (`pending | active | suspended`).
- **The existing `venues` table is reused**, not replaced: nullable `org_id`,
  `slug`, `is_active` columns are added. Availability signals, demand data,
  and venue-verified catches all share one venue identity; unmanaged venues
  keep working with `org_id IS NULL`.
- A minimal `markets` table is added now (one `IL` row). The
  `beer_market_availability` migration is formally deferred to Phase D.

## Data model (by phase)

All migrations idempotent. Phase A tables are sliced in #297; Phase B/C tables
are sliced in their vertical slices.

**Phase A:** `markets`; `organizations {id, slug, name, market_id,
branding_config jsonb, status}`; `staff_members`, `staff_venue_roles`
(`org_owner | venue_manager | bartender`), `staff_permission_overrides`
(Discord-style grant/deny per capability), `staff_invites` (7-day,
single-use); `venue_menu_items {venue_id, beer_id, status on|off,
serving_format, price_ils, position, unique(venue_id, beer_id)}`; `venues` +
`org_id`/`slug`/`is_active`. Publishing/toggling a menu item also upserts
`beer_availability` and appends an `availability_signal` (new staff/venue
actor variant) — managed menus become the highest-trust availability source.

**Phase B (ordering — optional per bar, ADR 0012):**

- `venues.ordering_mode` enum `off | native | integrated` (default `off`).
  `off` venues get menu + recommendations only; the consumer UI hides order
  actions. `native` = in-app cart + staff live-orders screen. `integrated` =
  orders dispatched to the bar's existing POS/ordering service via adapter.
- `orders {id, venue_id, user_id?, session_token?, table_label, status
  placed|acked|in_progress|served|cancelled, payment_status
  unpaid|pending|paid|refunded|failed|external, payment_provider_ref?,
  external_order_ref?, total_ils, acked_by?, timestamps, index(venue_id,
  status, created_at)}` — `external` payment_status + `external_order_ref`
  cover POS-handled orders.
- `order_items {order_id, beer_id, qty, price_ils_snapshot,
  match_pct_snapshot}` — multi-item cart from day one.
- `venue_ordering_config {venue_id, dispatch_provider?, dispatch_config
  jsonb, payment_provider?, payment_account_ref?, currency}` — one config row
  drives both adapter seams (order dispatch: OD-006b; payment: OD-006; bar's
  own merchant account, Beerolog never merchant of record). When a POS
  integration handles payment, the payment adapter is bypassed
  (`payment_status='external'`).
- `beer_ratings` + nullable `outcome as_expected | not_what_expected |
  better_than_expected`, `venue_id?`, `order_id?`; ratings linked to a served
  order get `proof_source='venue_verified'` (builds on the catch-beers seam,
  PR #343 / ADR 0011).
- `venue_visits {venue_id, user_id?, session_token?, source qr|link}` —
  funnel + area attribution.

**Phase C:** `area_taste_aggregates {city, area?, n_users, dials jsonb,
flavor_family_dist jsonb, archetype_dist jsonb, computed_at}` —
job-materialized, **never served when `n_users < K`** (k-anonymity floor,
OD-007, proposed K=20, one shared constant). `supply_recommendations
{venue_id, beer_id? | style_suggestion, rationale, evidence jsonb, status
active|dismissed|done}`.

Not tables: demand signals (want-to-try × venue menu) and venue-verified catch
rollups are queries; materialize only if slow.

## API (by phase)

**Tenant scoping first (#298):** a `get_staff_context(venue_id)` dependency
validates the **staff Clerk instance** JWT (separate issuer from consumer —
issuer mix-up is a tenant-isolation bug class and an explicit test target),
resolves role ⊕ overrides, asserts venue ∈ org; cross-tenant access is a 403
(ADR 0010).

- **Staff, Phase A (as sliced #295–#306):** org onboarding, venue CRUD,
  `/staff/venues/{id}/menu` CRUD + toggle, catalog gap + LLM enrichment,
  invites, k-floored analytics, QR management.
- **Staff, Phase B:** `PATCH /staff/venues/{id}/ordering-config` (mode toggle
  + adapter config); `GET /staff/venues/{id}/orders?status&since` (5s polling,
  no websockets v1; native mode only); `PATCH /staff/orders/{id}` (status
  transitions). On order placement the venue's dispatch adapter runs —
  `native` writes for the polling screen; `integrated` POSTs to the external
  service and mirrors status back via webhook/poll.
- **Consumer/public, Phase B:** `GET /public/venues/{slug}` (branding +
  published menu; active orgs only, else 404); `POST
  /public/venues/{slug}/visit`; `POST /venues/{slug}/orders` (auth or guest,
  rate-limited per token); `GET /venues/{slug}/orders/{id}` (status → outcome
  prompt); payment webhook endpoint per adapter; outcome write folded into
  existing ratings routes. **Deck ranking reuses the `menu.py` rank flow**
  (published-menu beer_ids in place of scan results — no new ranking
  endpoint). Guests reuse `guest_recommendations.py`.
- **Phase C:** `/staff/venues/{id}/demand`, `/area-taste`,
  `/supply-recommendations` (+ dismiss), `/returns` — all k-floored. Supply
  job: script in `apps/api/scripts/` on a weekly cron — refresh area
  aggregates from `user_baseline_taste` × visit/rating attribution, then gap
  analysis (area flavor distribution vs venue menu vs market catalog) →
  existing LLM adapter → ≤3 suggestions with plain-language rationale; runs
  only when the aggregate or the menu changed.

## Consumer web (Phase B/C)

- `v.$venueSlug.tsx`: QR landing; org accent color as a CSS custom-property
  override + logo, "powered by Beerolog" secondary (no full theming v1);
  inline cold-start quiz when no profile; menu-scoped deck via the existing
  deck components; fires the visit event.
- Order actions render only when `ordering_mode != off`. "Order this" → cart
  (multi-item) → table label → provider checkout, pay-at-bar, or
  external-service handoff per venue config → confirmation with live status.
- "Was it right?": after the order is served (lazy poll) or a ~15-minute
  timer — one-tap 3-state rating **plus** outcome chip; writes venue/order
  attribution and `venue_verified` proof.
- Confidence + taster flight (Phase C): confidence tier from match % ×
  per-beer outcome history at that venue; below threshold, suggest "ask for a
  taster of X and Y" (client-side, no new backend).
- PostHog typed events (consent-gated, existing pipeline):
  `venue_menu_deck_viewed`, `order_placed`, `order_paid`, `order_served`,
  `rating_outcome_set`.
- All UI via shared primitives, i18n he/en, RTL-safe.

## Phase map

| Phase | Content | Tracker |
|---|---|---|
| **A — Foundation** | Staff portal: shared packages, tenant schema, scaffold + auth, org onboarding, tap list, catalog gap, analytics, staff mgmt, QR, deploy | #296–#306 (edited 2026-07-28) |
| **B — In-venue consumer loop + ordering** | Branded consumer deck (B1 #346), native orders opt-in (B2 #347), payments (B3 #348), external POS integration (B3b #349), outcome signal (B4 #350), demand panel (B5 #351) | Issues #346–#351 |
| **C — Bar intelligence** | Return-rate analytics + taster flights (C1 #352), area taste aggregates (C2 #353), supply recommendations (C3 #354) | Issues #352–#354 |
| **D — Deferred** | `beer_market_availability` migration + multi-market activation (per-market config, locales), operator console (approval/exception queues, audit, network health), cross-venue predictive benchmarks (the original 10+-bars tier; C2/C3 is its area-level precursor) | Documented only, not sliced |

Dependency spine: `#296 → #297 → #298 → {#299, #300, #304} → {#301 → #305,
#302, #306} → B1 #346 → B2 #347 → {B3 #348, B3b #349, B4 #350} → {B5 #351,
C1 #352} → C2 #353 → C3 #354`; #303 runs in parallel after #298. The umbrella
PRD is mirrored as issue #345.

## Open decisions

- **OD-006** — payment provider + IL alcohol-sale legal review (blocks B3)
- **OD-006b** — first external POS/ordering integration target (blocks B3b)
- **OD-007** — privacy floor K (blocks Phase C analytics panels)
- **OD-008** — B2C data feeding B2B area insights (blocks C2/C3)

See `docs/prds/open-decisions.md`.

## Risks

1. **Payments/integrations are the long pole:** the IL provider landscape (no
   Stripe for IL merchants), alcohol-sale-at-transaction legal questions
   (age verification, hours-of-sale), per-bar merchant onboarding friction,
   and POS APIs of varying quality. Mitigated by ordering being optional per
   venue, B2 shipping the native flow with pay-at-bar first, and B3/B3b each
   gated on their own open decision.
2. Staff ignoring the live-orders screen makes ordering feel broken — honest
   consumer status copy + an ack-rate metric per venue.
3. K too high → empty dashboards for small venues; too low →
   re-identification risk. OD-007.
4. Area attribution is thin until B1 has traffic — C2 is sequenced after real
   visits accumulate.
5. Dual Clerk issuers on one API — explicit isolation test target in #298.

## Out of Scope (this PRD)

- Multi-market activation and `beer_market_availability` (Phase D)
- Operator console (Phase D)
- Cross-venue predictive benchmarks (Phase D)
- Cocktail / spirit catalog (deferred per ADR 0009)
- Beerolog as merchant of record for any payment (never — ADR 0012)
