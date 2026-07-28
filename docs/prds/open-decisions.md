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

## How to close an open decision

1. Owner makes the decision (product conversation, doc comment, or async note)
2. Update this file: replace the options table with "**Decision**: [chosen option]. [date]."
3. Write or update the relevant ADR if the decision is architectural
4. Write the PRD for the feature if implementation follows immediately
5. Remove the item from this file once the ADR/PRD is written and accepted
