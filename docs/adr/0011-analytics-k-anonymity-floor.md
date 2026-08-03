# ADR 0011: Analytics distinct-user suppression floor (K = 20)

- Status: Proposed
- Date: 2026-08-01

## Decision

Every operator-facing aggregate view suppresses any cell or segment computed over fewer
than **20 distinct users**. Below-threshold results are **withheld** — returned as an explicit
typed `suppressed` status (see "Typed suppression contract"), never as a small count, a
rounded / near-zero figure, `null`, or an empty array. The floor applies uniformly to all
`tenant_id`-scoped aggregate queries — taste distributions, recommendation outcomes, per-beer
demand/returns, and any future cross-tenant benchmark Beerolog computes.

The threshold is evaluated **per released cell** on **distinct-user** counts
(`count(distinct user_id)`) — for a `tenant_id`-scoped query, per tenant; for a per-beer
breakdown, per beer; for a cross-tenant benchmark, per cohort within it — so a view that
clears 20 distinct users in total never exposes a cell backed by fewer than 20 distinct
contributors.

This is a **distinct-user suppression floor, not a full k-anonymity guarantee** (see
"Residual risks"). It supplies the minimum-N guard that **ADR 0010** requires but did not
specify. ADR 0010 mandates "aggregate, anonymised only" for bar operators (e.g. "70% of your
customers prefer bitter beers tonight") without defining the minimum N below which such an
aggregate can re-identify an individual. K = 20 is that N.

## Context

An "aggregate" over a tiny population is not anonymous: "100% of your 2 customers tonight
prefer sour beers" identifies those two people to a bar owner who watched them order. A
minimum-contributor floor is the standard first guard — withhold any statistic backed by
fewer than K distinct users.

K = 20 is a conservative, commonly-used suppression floor: high enough to block single-user
and small-group re-identification, low enough that busy venues still see live numbers. It is
an internal privacy-engineering parameter; counsel's concern (OD-008) is disclosing that
aggregation happens and confirming the floor's sufficiency — not choosing the constant.

## Residual risks (why this is a floor, not anonymity)

A single-release, per-cell distinct-user floor does **not** by itself guarantee
non-re-identification. Known residual risks, and the controls this ADR requires:

- **Homogeneous cells** — a cell with ≥ 20 users can still disclose an attribute when
  (nearly) all of them share it ("all 22 prefer bitter"): the operator learns a fact about
  every contributor. *Control:* treat the floor as necessary-not-sufficient; for attribute
  disclosures prefer coarse buckets, and add an l-diversity / t-closeness check before
  Phase C ships sensitive breakdowns.
- **Differencing / overlapping cells** — two views that each clear K (e.g. "this week" vs
  "this week + today") can be subtracted to isolate a sub-K group. *Control:* K is applied to
  every released cell, and overlapping time/segment slices must each independently clear K on
  their own distinct-user set; no incremental re-release that would expose a below-K
  difference.
- **Operator prior knowledge** — a bar owner physically observes who is present. *Control:*
  the floor is calibrated (K = 20, not 5) against exactly this observer; sensitive or
  real-time cells stay coarse.
- **Repeated queries** — many narrow queries accumulate signal. *Control:* enforcement lives
  at the API/query layer (below), so every cell in every response is checked, not just the
  default dashboard view.

These are why the title says *suppression floor*: it is the baseline control, with
differential privacy (below) as the upgrade path if a later, finer-grained release needs it.

## Typed suppression contract

Enforcement is a typed contract, not an ad-hoc `null`/empty convention, so callers can always
distinguish **suppressed** from **zero** from **missing/error**:

- Every aggregate cell (or per-beer row) carries an explicit status: `ok` (backed by ≥ K
  distinct users; value present) or `suppressed` (below K; **no** value and **no** count —
  the raw contributor count / `n_raters` is itself withheld).
- `suppressed` is distinct from a legitimate `0` value and from an empty result set. Empty
  arrays and `null` MUST NOT be overloaded to mean "suppressed".
- K is applied **per released cell** on **distinct-user** counts (`count(distinct user_id)`),
  never on row counts, event counts, or `count(*)`.
- Below-K per-beer or per-segment rows are **omitted or marked `suppressed`** — never
  returned with their raw count, so a client cannot sum or difference them back.
- Genuine errors use HTTP error status codes with **no** metric metadata in the body — an
  error is never encoded as a metric value.

Enforcement is at the API/query layer (alongside ADR 0010's `tenant_id` scoping), so the UI
cannot re-derive suppressed numbers.

> **Compliance gap (Phase C).** The Phase-C analytics endpoints landed ahead of this ADR
> (`staff_analytics`, `staff_demand`, `staff_returns`, and `staff_org` org rollups) currently
> expose raw `n_raters` / per-beer `want_count` and use `null` / empty arrays to signal
> absence. They do **not** yet implement this contract. Bringing them into compliance (typed
> `suppressed` status, distinct-user K per cell, no below-K counts) is the work this ADR
> gates before operator-facing analytics ship. Tracked against OD-007 / Phase C.

## Consequences

- **Query layer**: aggregate queries return the typed `suppressed` status for below-K cells;
  the API must not leak the raw count. Enforced alongside ADR 0010's `tenant_id` scoping, at
  the API layer — not just the UI.
- **UX**: operator dashboards show an explicit "not enough data yet" state for suppressed
  cells rather than a misleadingly precise small number.
- **New / quiet venues**: small venues may see mostly-suppressed views until they accumulate
  ≥ 20 distinct users in the relevant window. Acceptable — privacy over early-stage vanity
  metrics.
- **Changing K**: raising or lowering the floor is a privacy-impacting change and requires
  updating this ADR (per ADR 0010's audit rule).

## Alternatives considered

- **No floor** (ADR 0010 as-is): re-identification risk in small venues. Rejected.
- **K = 5 / K = 10**: common lower floors; rejected as too permissive for a venue owner who
  can physically observe a small crowd.
- **Rounding / added noise (differential privacy)**: stronger against differencing and
  homogeneity than a raw suppression floor, but overkill for v1 aggregate menu intelligence.
  It is the documented upgrade path (with l-diversity / t-closeness) if the deferred
  cross-venue predictive analytics (ADR 0010) need finer-grained or repeated release. Use the
  suppression floor now; add DP only if a later release genuinely needs it.

## References

- ADR 0010 — tenant data governance (this refines its aggregate-only mandate)
- OD-007 (`docs/prds/open-decisions.md`) — the decision this ADR records
- OD-008 / `docs/legal/counsel-brief-payments-and-data.md` §B — the disclosure wrapper
