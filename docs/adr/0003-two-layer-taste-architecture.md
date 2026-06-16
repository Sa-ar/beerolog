# Two-layer taste architecture

- Status: Accepted
- Date: 2026-06-15

## Decision

The taste profile is modelled in **two layers**, not one:

- `BaselineTaste` — persisted, slowly-evolving. Seeded from a non-beer-language onboarding quiz; updates as the user rates beers (rating-update wiring deferred to a later validation pass). Composed of explicit dials, a `NoveltyAffinity` modifier, and a derived multilingual embedding.
- `SessionIntent` — ephemeral, single-occasion. Captured at the start of a drinking session via two quick-picks (`vibe`, `ABV intent`) plus optional free text. Embedded independently and discarded at session end.

A `Match` is two separate pgvector retrievals — baseline and session — merged by weighted cosine (`α = 0.6` baseline / `0.4` session by default), then re-ranked by a novelty term (`β = 0.3 · (NoveltyAffinity − 0.5) · beer.adventurousness`). Both weights are tunable.

This replaces the prior single 7-dimension `FlavorVector` model implied by ADR-0001 and the original `CONTEXT.md`.

## Context

The initial product framing (ADR-0001, `quiz-polish`, `results-polish` PRDs) assumed taste was a single vector representing "who you are as a drinker." In use, two distinct phenomena collapsed onto that one vector:

1. **Stable preferences** — you generally don't like sour beers.
2. **Session context** — but tonight it's hot and you want something refreshing.

A single vector cannot represent both without one continuously overwriting the other. The matcher would either feel amnesiac (session dominates) or unresponsive to mood (baseline dominates). Separating them lets each layer be sized, sourced, and updated on its own cadence — and lets the merge weight be an explicit knob rather than an emergent property of update order.

At the same time, the pivot to RAG / vector matching against a richer beer catalog made the high-dimensional embedding side of the model load-bearing in a way the original 7-D dial model wasn't. Keeping the user-facing dials as an explainable surface while running similarity on derived embeddings underneath is the only way both "3 short questions" and "true vector matching" survive in the same product.

## Considered alternatives

- **Single composite vector** (status quo `FlavorVector`). Rejected: collapses two independent phenomena, no way to expose a tunable session/baseline knob, and dial-only matching throws away the RAG architecture's whole point.
- **Embed once at recommendation time** — concatenate baseline + session into one string and embed per call. Rejected: couples the two layers in a way that's impossible to debug ("why did the session win?"), and pays an embedding API call on every recommendation.
- **Filter-then-rank** — session as hard SQL filter, baseline as similarity rank. Rejected: hard filters require pre-categorising beers across every session dimension, partly defeating the embedding approach, and "refreshing" is not a SQL predicate.

## Consequences

- **Schema**: User carries `BaselineTaste` (dials + embedding + NoveltyAffinity) as persisted state. SessionIntent is request-scoped, not persisted past a session. Beer carries `embedding` + `adventurousness` for the re-rank.
- **Hard to reverse**: changing the layer count later means re-modelling user state, re-shaping every recommendation call, and either re-embedding the catalog or accepting a discontinuity in stored embeddings.
- **Tunability becomes a first-class concern**: `α` and `β` are explicit weights, not hidden constants. The persona-based evaluation (P@5 floor 0.6) gates changes to either.
- **Onboarding stays short**: because the baseline only needs to represent stable taste, the quiz can be cross-sensory and ~30 seconds. Per-session context is captured at use time, not at sign-up.
- **ADR-0001 boundary is preserved but reframed**: signed-in solo flow is still the MVP, but "`Recommendation`" is no longer menu-scoped — it's a catalog-wide match. Venue/menu-scan is deferred to a future ADR.
