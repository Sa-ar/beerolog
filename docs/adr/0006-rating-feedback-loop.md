# Rating feedback loop

- Status: Accepted
- Date: 2026-06-28

## Decision

Activate the rating→`BaselineTaste` feedback loop that
[ADR-0003](0003-two-layer-taste-architecture.md) and
[ADR-0005](0005-richer-taste-model-and-adaptive-quiz.md) explicitly deferred
(`[[rating-feedback-loop-deferred]]`). A rating now updates the persisted baseline.

- **Rating model is 3-state** `loved | fine | disliked`, reversing the migration-0001
  integer-1–5 pivot. Research-backed (Netflix +200% feedback on thumbs vs stars; ACM
  RecSys: feedback quantity beats granularity): the embedding nudge needs direction, not
  magnitude, and the nuance a star scale would crudely encode is carried by the free-text
  note + the beer embedding. `fine` is a neutral no-op.
- **Embedding nudge.** Each rating moves the persisted baseline embedding toward (loved) or
  away (disliked) the rated beer, stepping along the beer component orthogonal to the
  baseline (a collinear guard ensures a disliked-yet-matching beer still moves). Guardrails:
  a per-rating cosine-distance cap, a cold-start learning-rate boost, and decay as ratings
  accumulate. Card ratings apply immediately; deck ratings apply as one combined nudge at
  session end (no mid-deck whipsaw).
- **Free-text notes** are analyzed by a dependency-injected LLM into capped per-dial deltas.
  Because `match_engine` ranks on the embedding and **not** the dials, the updated dials are
  re-composed to synthetic text and re-embedded (the CONTEXT.md "embedding refreshed on dial
  change" contract), then blended with the nudged embedding so neither signal is lost. The
  note is untrusted input: deltas are confidence-scaled and hard-capped as a prompt-injection
  backstop, and analysis runs in a background task.

## Context

Ratings were stored from day one but never read; the loop was held until the matcher could be
validated. With the matcher and persona harness in place, activating the loop is the next step
toward the product promise of a taste that sharpens with use. Surfaces: a rating control on
every recommendation and a Tinder-style `/rate` deck.

## Consequences

- **Re-rating** upserts the rating row exactly (unique `(user_id, beer_id)`), but the embedding
  contribution is best-effort and bounded by the caps — exact dedup is a property of a future
  periodic recompute, intentionally out of scope here.
- **Tuning knobs** (learning rate, caps, decay thresholds, deck mix, dial-delta cap, blend
  weight) are config-exposed and must be validated against the persona harness floor
  (`P@5 ≥ 0.6`, taste-profile-matcher PRD) before being treated as settled.
- **Privacy ([ADR-0004](0004-compliance-privacy-and-accessibility.md)).** Notes are sent to
  OpenAI (already a listed processor), included in `GET /me/export`, and removed on
  `DELETE /me`. The `/rate` note box carries a sensitive-data caution.

## Deferred

Periodic recompute / calibration job; note→embedding term synthesis (v1 routes notes through
dials); drag-to-swipe gestures; a "loved a lot" tier.
