# Richer taste model and adaptive onboarding quiz

- Status: Accepted
- Date: 2026-06-21

## Decision

Extend the `BaselineTaste` layer of [ADR-0003](0003-two-layer-taste-architecture.md) and
replace the fixed 7-question onboarding quiz with an **adaptive, branching quiz** that stays
short while extracting more signal. Specifically:

- **Add three first-class dials** to `BaselineTaste`: `sweetness`, `body`, and `abv_affinity`
  (each `0..1`). Research identified sweetness/body and alcohol-strength appetite as the
  highest-value axes missing from the current model.
- **`abv_affinity` is a constraint, not a similarity axis.** It feeds the existing ABV term
  (`abv_term_for_beer`) as a soft default band (`<0.35` low / `>0.65` high, else medium) only
  when a session sets no ABV intent (or `any`); an explicit session ABV always overrides. It
  does **not** enter the cosine embedding (cosine ignores magnitude).
- **Adaptive quiz.** A frontend question graph keeps the always-shown core small (~7) and pushes
  depth into conditional sub-questions that fire only on extreme answers (e.g. black coffee,
  "love it"). Coffee is reframed around sweetened-vs-unsweetened (the single best bitterness
  proxy). Carbonation is kept light and unbranched. An optional capstone flavor-cue grid feeds
  both `flavor_family` dials and the embedded sentence.
- **`compose_text()` becomes combination-aware** — the embedded sentence is built from the
  interaction of answers, not concatenated per-answer fragments. This remains the dominant
  matching signal.
- **A persona is generated per profile by an LLM**, in both `en` and `he`, and persisted on the
  baseline. It is cosmetic (a result payoff), never a matching input. The generator is
  dependency-injected and mocked in tests, like the embedding and icon clients.
- **Versioned profiles + forced re-quiz.** A `model_version` column gates stale profiles: when a
  user's stored version predates the current model, their profile is treated as empty and they
  retake the (improved) quiz. Migration is non-destructive.
- **Remove the unused `PATCH /me/baseline-taste` dial-editor endpoint** (no UI consumes it).

This supersedes the dial set and onboarding shape described in ADR-0003; the two-layer
baseline/session architecture and its α/β merge are unchanged.

## Context

The quiz mapped 7 closed answers to dials and a sensory sentence; the sentence is embedded and
cosine-matched (only `novelty_affinity` is used numerically). Two research passes — an internal
web sweep and a user-supplied document, every claim revalidated — converged on the same gaps:

1. **Lossy inputs.** Coffee buckets miss milk-based; answers are siloed to one dimension; flavor
   families collapse to 2–3 discrete values; novelty is binary.
2. **Missing axes.** Sweetness/body and ABV/strength are primary segmentation axes (Meilgaard
   beer flavor wheel; consumer segmentation splits on sweetness/body first) yet were uncaptured.
3. **Format.** Forced-choice + a small intensity scale beats Likert/sliders for completion and
   data quality; branching on extremes adds signal without fatigue.

The rejected ideas (0–100 sliders, scored carbonation as a taste type, a spice/heat axis, and
pairwise beer-vs-beer "flight" mechanics) are recorded so they are not re-litigated: sliders are
used inconsistently, carbonation liking is habituation-driven and weak, capsaicin heat is
trigeminal with no clean beer bridge, and flights suit in-person tasting, not a cold-start quiz
for people who don't know beer.

## Considered alternatives

- **Capture sweetness/body/ABV in the embedding text only** (no new dials). Rejected: the user
  wants them as explainable, displayed dials, and ABV needs to act as a magnitude constraint that
  cosine cannot express.
- **Graceful opt-in refresh for existing users** (neutral defaults until they retake). Rejected
  in favor of forced re-quiz: mixed old/new embeddings degrade match quality and the data-quality
  bar matters more than avoiding one interruption at the current scale.
- **Deterministic persona** from dial thresholds. Rejected in favor of LLM personas for variety
  and flair; the cost is one mocked-in-tests call at quiz time and bilingual persistence.
- **Keep/extend `PATCH`**. Rejected: no UI consumes it; maintaining it through the model change is
  unjustified (deletion over half-modeling).

## Consequences

- **Schema (hard-ish to reverse):** `user_baseline_taste` gains `sweetness`, `body`,
  `abv_affinity` (real), `model_version` (int), and bilingual persona columns. A non-destructive
  migration backfills existing rows; `model_version` gates them to re-quiz.
- **Forced re-quiz interrupts every current user** on next visit. Acceptable at pre-/early-launch
  scale; revisit if the active base grows.
- **Matching:** `abv_affinity` now shapes even sessionless recommendations via the ABV term.
  Cosine path and the α/β merge are unchanged. Persona never affects matching.
- **Onboarding stays short** but adaptive; median path ~7 questions with optional depth. The
  capstone and branches are skippable to protect against abandonment.
- **Process:** decisions flow to a PRD (`docs/prds/`) and vertically-sliced issues; slices ship
  atomically behind the `model_version` bump so no user is blocked on a half-built quiz.
- **Still deferred:** the rating→baseline feedback loop (ADR-0003) and an ester/yeast dial
  (folded into `fruity` for v1).
