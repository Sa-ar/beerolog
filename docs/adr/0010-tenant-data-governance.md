# ADR 0010: Tenant data governance and operator data access model

- Status: Accepted — amended, see Amendment 2026-07-28
- Date: 2026-07-25

## Decision

White-label bar operators have access to **aggregate, anonymised data only**. Individual user
taste profiles are never exposed to bar operators — not in v1, and not without a separate,
explicit consent architecture that does not yet exist.

### What bar operators can see (v1)

1. **Aggregate taste distribution** — the anonymised distribution of taste preferences across
   their active customer base. e.g. "70% of your customers prefer bitter beers tonight." Derived
   from session quiz responses at the venue level. Never linked to individual identities.

2. **Recommendation outcomes** — which beers were surfaced and whether they were ordered. This
   gives bars actionable menu intelligence (which beers are working, which aren't) without
   exposing any personal data.

These two data views are included in the white-label subscription at no additional cost. There
is no analytics tier — all analytics ship as part of the base product (see OD-005).

### What bar operators cannot see

- Individual user taste profiles or quiz responses
- Cross-session user history (who came back, how often)
- Any personally identifiable information
- Data from other tenants

### Data isolation

All operator-facing queries are scoped to `tenant_id`. No query returning data to a bar operator
may join across tenant boundaries. This is enforced at the API layer, not just by convention.

### Predictive analytics (deferred)

Cross-venue benchmarks and stocking recommendations (e.g. "bars like yours stock X") require
network scale (~10+ active partner bars with order data). These are deferred to a later phase
but are included in the subscription when they ship. The data model supports them without schema
change — they are aggregate, cross-tenant reads that Beerolog executes, not data exposed to
operators.

## Context

### Why aggregate-only in v1

Exposing individual taste profiles to bar operators would require:

- A separate processing purpose disclosure under GDPR Article 13/14
- Explicit, granular user consent under Israeli Privacy Protection Law (Amendment 13)
- A data processing agreement (DPA) with each white-label tenant
- A mechanism for users to see which tenants have accessed their profile and revoke access

None of these are in place for v1. Aggregate data derived from session responses does not
identify individuals and does not trigger the same consent obligations — it is functionally
equivalent to anonymous session analytics.

### Why recommendation outcomes are safe

A recommendation outcome record is: `{ tenant_id, beer_id, was_ordered: bool, session_date }`.
No user identifier is stored in the operator-visible view. This is sufficient for menu
intelligence without exposing personal data.

### Compliance alignment

This decision aligns with:

- GDPR Article 5(1)(b) — purpose limitation: taste profile data was collected for
  personalisation, not for sharing with third-party operators
- GDPR Article 25 — data protection by design: least-privilege operator access by default
- Israeli Privacy Protection Law — equivalent purpose-limitation obligation
- ADR 0004 (compliance, privacy, and accessibility) — the baseline compliance posture

## Consequences

- **Schema**: No new tables required. Operator-facing aggregate views can be materialised as
  Postgres views or application-level aggregation queries scoped by `tenant_id`.
- **API**: All operator-facing endpoints enforce `tenant_id` scoping at the middleware level.
  A missing or mismatched `tenant_id` is a 403, not a 404.
- **Audit**: Material changes to tenant data access rules (e.g. expanding what operators can
  see) require a new ADR and a privacy impact review before shipping.
- **Future consent architecture**: If profile portability or individual-level data access is
  introduced for operators, it must be designed as an opt-in, per-tenant, per-user consent
  flow — not added quietly to existing data pipelines.

## Alternatives considered

- **Full profile sharing with consent**: would unlock richer personalisation at the venue but
  requires a non-trivial consent infrastructure that is out of scope for v1. Deferred.
- **No analytics at all**: maximally safe but removes the B2B value proposition. Rejected.
- **Per-user opt-in at venue check-in**: architecturally sound but requires the consent surface
  to exist before the staff portal ships. Deferred with profile portability.

## Amendment (2026-07-28): new operator-visible aggregates and the k-anonymity floor

This amendment is the review this ADR's own audit clause requires ("material
changes to tenant data access rules require a new ADR and a privacy impact
review before shipping") for the white-label platform's Phase B/C analytics
(`docs/prds/white-label-platform.md`).

### Additional operator-visible data (all aggregate, all tenant-scoped)

1. **Demand signals** — counts of users who want-to-try beers on/off the
   venue's menu (e.g. "12 people want beers you don't stock"). Counts only,
   never the users.
2. **Order and return-rate rollups** — per-beer order counts and outcome
   distribution (`as_expected | not_what_expected | better_than_expected`)
   from ratings attributed to served orders. Extends the already-permitted
   "recommendation outcomes" view with the ordering module (ADR 0012).
3. **Area taste aggregates** — distribution of taste dials, flavor families,
   and archetypes for a city/area, computed by job from consenting users'
   baseline taste × visit/rating attribution. Cross-tenant by nature but
   **area-scoped, not venue-scoped**, and Beerolog computes it — operators
   only ever see the aggregate output.
4. **Supply recommendations** — LLM-generated stocking suggestions grounded
   exclusively in the aggregates above plus the venue's own menu and the
   market catalog.

Gate: area aggregates and any B2C-derived insight (items 3–4) additionally
require **OD-008** resolved (processing-purpose line in the privacy policy)
before shipping.

### Anonymisation mechanism: the k-anonymity floor

Every operator-facing panel or endpoint that aggregates over users enforces a
minimum distinct-user count **K** (OD-007, proposed K=20, one shared constant
across API and jobs). Below the floor the response is an explicit
"not enough data" state — never small-n numbers, which are re-identifiable in
a small venue. This applies to the original taste-distribution views as well
as the new aggregates above; `area_taste_aggregates` rows with `n_users < K`
are never served.

### Unchanged

Everything in "What bar operators cannot see" stands. Individual profiles,
cross-session user history, PII, and cross-tenant venue data remain off the
table. Tenant scoping is enforced at the API layer via the staff context
dependency; under the unified tenant model (ADR 0009 addendum), `tenant_id`
reads as `org_id`.
