# Open Product Decisions

Decisions raised in product conversation that are not yet resolved. Each item
blocks a specific PRD or ADR. Resolve by owner decision, then close the item
and write the corresponding ADR or PRD update.

---

## OD-001: Taste profile portability model for white-label

**Blocks**: White-label tenant PRD, consent surface design, profile data governance ADR.

**Decision (2026-07-25)**: Cold start at every white-label venue — users complete a short re-quiz (~30 seconds) per bar session. No cross-tenant profile portability in v1.

**Rationale**: The B2C Beerolog app has limited traction, so there is no meaningful existing user base whose profiles are worth carrying across venues. The anonymous vector token approach was considered but the engineering complexity only pays off with an active cross-venue user base. The B2C app will be kept alive as a thin shell (same codebase, minimal incremental cost) but not actively invested in. Profile portability will be revisited once 2+ active white-label bars exist and cross-venue user overlap can be measured.

**ADR needed**: No architectural decision required — cold start requires no schema change.

---

## OD-002: Data governance — what does a white-label bar see?

**Blocks**: White-label tenant PRD, B2B analytics design, privacy compliance update.

**Decision (2026-07-25)**: Bar operators can see (1) aggregate anonymised taste distribution of their customer base and (2) which beers were recommended and whether they were ordered. No individual taste profiles are visible to bar operators.

**Rationale**: Aggregate stats are useful enough for B2B intelligence (e.g. "70% of your customers prefer bitter beers") without requiring the heavy consent burden of individual profile sharing. Recommendation outcomes (recommended + ordered) give bars actionable menu intelligence. Individual profiles are off the table for v1 — they would require a separate processing purpose disclosure under GDPR and Israeli privacy law.

**ADR needed**: Yes — data governance and tenant data access model should be captured in an ADR before the white-label PRD is written.

---

## OD-003: User consent surface for cross-tenant profile sharing

**Blocks**: White-label tenant PRD, age gate / onboarding flow update, privacy compliance.

**Decision (2026-07-25)**: Deferred — resolved by OD-001. Since white-label bars use cold start with no cross-tenant profile sharing in v1, there is nothing to consent to. Revisit when/if profile portability is introduced.

---

## OD-004: v1 scope of food pairing and upsells

**Blocks**: Staff portal PRD, `CatalogItem` non-beer category activation.

**Decision (2026-07-25)**: Ship food pairing with the staff portal. When bars enter their food menu, the LLM enrichment pipeline auto-generates `FoodPairing` records. No additional engineering required beyond the enrichment pipeline already planned. The `CatalogItem` schema already supports food as a category (ADR 0008).

**ADR needed**: No — schema already supports this. Staff portal PRD should include food menu entry and pairing enrichment in scope.

---

## OD-005: B2B intelligence tier — pricing and data model

**Blocks**: B2B/bar analytics PRD, multi-tenancy tier design.

**Decision (2026-07-25)**: All analytics — descriptive and (eventually) predictive — are included in the white-label subscription. There is no free tier of the white-label product; the subscription itself is the paid offering. Feature gating analytics within the product adds friction without meaningful revenue benefit. Predictive intelligence (cross-venue benchmarks, stocking recommendations) will be added to the base product when network scale (~10+ active bars) makes it viable.

**ADR needed**: Pricing model and tenant subscription structure should be captured before the first bar contract is written, but no schema change is needed now.

---

## OD-006: In-venue payment provider + IL alcohol-sale legal review

**Blocks**: White-label slice B3 (payments) — see `white-label-platform.md` and ADR 0012.

**Open** (raised 2026-07-28). Two questions that must resolve together:

1. **Provider**: which IL payment provider ships first for the payment adapter?
   Candidates: PayPlus, Meshulam/Grow, Tranzila, Cardcom. Stripe is not an
   option — it does not onboard Israeli businesses. Selection criteria: API
   quality (tokenized checkout + webhooks), per-bar merchant onboarding
   friction, refund API, fees. The bar's own merchant account is used;
   Beerolog is never merchant of record (ADR 0012).
2. **Legal**: how do Israeli alcohol-sale rules apply to in-app purchase at a
   licensed venue — is transaction-time age verification required beyond the
   existing 18+ age gate, and do hours-of-sale restrictions (23:00–06:00 sales
   limits) apply to an in-app order served on premises? Needs counsel review
   before any paid order ships.

---

## OD-006b: First external POS/ordering integration target

**Blocks**: White-label slice B3b (`ordering_mode='integrated'`) — see ADR 0012.

**Open** (raised 2026-07-28). Which POS/ordering service does the order-dispatch
adapter integrate first? IL candidates: Tabit, Presto, Cash-It. Needs market
research: which systems the target bars actually run, API availability
(order injection + status webhook/poll), and partnership terms. Independent of
OD-006 — a bar picks native, integrated, or off.

---

## OD-007: Privacy floor K for operator-facing aggregates

**Blocks**: White-label analytics panels (#301, #305, B5, C1, C2) — see ADR 0010 amendment.

**Open** (raised 2026-07-28). The minimum distinct-user count below which no
operator-facing aggregate is served. **Proposed default: K=20**, defined once
as a shared constant used by both API endpoints and aggregate jobs. Trade-off:
too high → empty dashboards at small venues; too low → re-identification risk
in small crowds. Owner may tune the default before Phase C ships; panels ship
with the constant either way.

---

## OD-008: B2C data feeding B2B area insights

**Blocks**: White-label slices C2 (area taste aggregates) and C3 (supply recommendations) — see ADR 0010 amendment.

**Open** (raised 2026-07-28). Area taste aggregates derive from consumer
(B2C) baseline-taste profiles and visit/rating attribution, then feed
bar-facing (B2B) intelligence. That is a processing purpose the privacy policy
does not currently state. Required before C2/C3 ship: (1) a purpose line in
the privacy policy covering aggregate, k-floored area insights, (2)
confirmation with counsel that k-anonymised aggregates keep this outside
GDPR/Israeli-law individual-consent territory (ADR 0010's reasoning suggests
yes, but the cross-context B2C→B2B use is new), (3) owner sign-off.

---

## How to close an open decision

1. Owner makes the decision (product conversation, doc comment, or async note)
2. Update this file: replace the options table with "**Decision**: [chosen option]. [date]."
3. Write or update the relevant ADR if the decision is architectural
4. Write the PRD for the feature if implementation follows immediately
5. Remove the item from this file once the ADR/PRD is written and accepted
