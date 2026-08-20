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

## OD-006: IL payment provider + alcohol-sale legal review

**Blocks**: Payments (Phase B3).

Two separable questions.

Beerolog is a **smart menu**: software the bar uses to sell. The **bar is the seller and merchant of record**; Beerolog does not sell alcohol or take custody of funds. That framing (not "facilitator of sale") drives both questions below.

**(a) Payment provider — Recommended (pending owner sign-off, 2026-08-01)**: **Grow (Meshulam)**, configured so the **bar is merchant / sub-merchant** and funds settle to the bar, not into Beerolog's account. Hosted checkout keeps PCI scope minimal and supports Bit + Apple/Google Pay. **Alternative**: Tranzila (both support sub-merchant/marketplace settlement). Where the first POS (OD-006b, Tabit) already owns payment, Beerolog may inject the order and let the bar's existing POS payment settle it — no separate Beerolog gateway needed. **Routing rule (to ratify):** use Grow by default; route through Tabit-owned payment only when the venue's ordering runs on Tabit's POS; in **both** paths the bar is merchant of record and funds never enter Beerolog's custody. The provider is not ratified until this routing contract is signed off.

**(b) Legal structure — Blocked on counsel (narrowed).** As pure SaaS where the licensed bar is the seller and merchant of record, Beerolog's alcohol-regulatory exposure is low. The counsel job is to **confirm the structure holds** — that Beerolog carries no alcohol-licensing obligation as long as funds settle to the bar and the bar is the contractual seller — and to say which enforcement duties (23:00 rule, age verification) the *software* must actively implement on the bar's behalf vs merely enable. Prepared questions live in the counsel brief (not published with the consumer repo), §A.

**ADR needed**: Payment-provider integration ADR once the provider is ratified and counsel confirms the merchant-of-record structure — not before.

---

## OD-006b: First POS / ordering integration target

**Blocks**: Ordering integration (Phase B3b).

**Recommended (pending owner sign-off, 2026-08-01)**: **Tabit**. It is the dominant IL mobile-first restaurant/bar POS, exposes an open partner API (menu sync + order injection), and has proven third-party integrations (e.g. OpenTable). Integrating one POS well beats a generic abstraction over several — start with Tabit; generalise only when a second partner POS is actually required.

**Rationale**: A first integration target should maximise (footprint × API quality); Tabit wins both in the IL market. Depends on OD-006 alcohol-sale legality clearing counsel before any live ordering ships.

**ADR needed**: POS-integration ADR when the first integration is built.

---

## OD-007: Analytics distinct-user suppression floor

**Blocks**: Phase C analytics (operator-facing aggregate views).

**Decision (2026-08-01, pending owner ratification)**: **K = 20**. Any operator-facing aggregate cell or segment computed over fewer than 20 distinct users is **withheld** (suppressed), not shown as a small or rounded number.

**Rationale**: ADR 0010 already mandates "aggregate, anonymised only" for bar operators (e.g. "70% of your customers prefer bitter beers tonight") but never specified the minimum cell size below which an "aggregate" can re-identify individuals. OD-007 sets that floor. K = 20 is a conservative, widely-used suppression threshold. This is an internal privacy-engineering parameter — counsel's concern is the *disclosure* (OD-008), not the number.

**ADR needed**: Yes — a follow-on to ADR 0010. Drafted but not published with the consumer repo; close this item once it is Accepted.

---

## OD-008: B2C data feeding B2B insights — privacy policy + counsel sign-off

**Blocks**: Phase C analytics that reuse consumer (B2C) data for B2B intelligence (C2/C3).

**Status**: **Blocked on counsel.** Using B2C consumer taste data to generate B2B insights is a **new processing purpose**. ADR 0010 already enumerates what that requires: a GDPR Art 13/14 purpose disclosure, a PPL (Amendment 13) consent basis, a per-tenant DPA, and a revocation mechanism. OD-007's K-floor (aggregate-only, ≥ K distinct users) is the **baseline** technical safeguard, **not the complete one**: a suppression floor alone does not stop linkage, differencing, overlapping/repeated-query, or homogeneous-cell attacks (NIST documents these limits). Before OD-008 closes, the ADR/policy must also define query scope, composition / re-release limits, access + audit controls, and revocation behaviour, or adopt a formal mechanism (differential privacy).

**Prepared for counsel**: the counsel brief (not published with the consumer repo) §B contains the processing-purpose analysis and a **draft privacy-policy clause**. Counsel confirms the lawful basis and whether the K-floor **plus these additional controls** are sufficient (or a formal mechanism such as differential privacy is required) and edits the clause; engineering keeps the draft banner until they sign off. Do not present OD-008 as resolved.

**ADR needed**: A follow-on to ADR 0010 only if the data-access model changes; the immediate output is the policy clause + counsel sign-off, not an architectural change.

---

## How to close an open decision

1. Owner makes the decision (product conversation, doc comment, or async note)
2. Update this file: replace the options table with "**Decision**: [chosen option]. [date]."
3. Write or update the relevant ADR if the decision is architectural
4. Write the PRD for the feature if implementation follows immediately
5. Remove the item from this file once the ADR/PRD is written and accepted
