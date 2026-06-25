# PRD: Adaptive taste quiz + richer taste model

- Status: Ready
- Parent ADR: [docs/adr/0005-richer-taste-model-and-adaptive-quiz.md](../adr/0005-richer-taste-model-and-adaptive-quiz.md)
- Related ADR: [docs/adr/0003-two-layer-taste-architecture.md](../adr/0003-two-layer-taste-architecture.md)

## Problem Statement

A person who signs up wants beer recommendations that actually fit their taste, from a quiz
that feels quick and fun — not a form. Today the onboarding quiz is a fixed list of seven
closed chips. It loses real preferences (the coffee options have no milk-based choice and
conflate preparation with taste), most answers feed only a single dimension, the flavor
families collapse to two or three values, and "novelty" is a yes/no. The result is a
`BaselineTaste` that is coarser than it should be, and an onboarding experience with no
payoff or delight. Two axes that strongly separate drinkers — sweetness/body and
alcohol-strength appetite — are never captured at all.

## Solution

Replace the fixed quiz with an **adaptive, branching quiz** that stays short (a small
always-shown core, ~7 questions) but extracts more signal by asking conditional
sub-questions only when an answer is at an extreme. Reframe the highest-signal question
(coffee) around sweetened-vs-unsweetened. Add three first-class dials to `BaselineTaste`:
`sweetness`, `body`, and `abv_affinity`. Make the embedded sensory sentence
combination-aware so it matches beers better. Give the quiz a real payoff: an LLM-generated,
bilingual **persona** and a results **radar**. Version the profile so existing users retake
the improved quiz once. The two-layer baseline/session architecture (ADR-0003) is unchanged.

## User Stories

1. As a new signed-in user, I want a quiz that asks about everyday foods and drinks, so that I can get beer recommendations without knowing beer vocabulary.
2. As a user, I want the quiz to feel quick, so that I don't abandon it before finishing.
3. As a user, I want each question answered one at a time with clear progress, so that I always know how much is left.
4. As a user, I want to go back and change a previous answer, so that I can correct a mistake without restarting.
5. As a user who takes coffee with milk, I want a coffee option that fits me, so that my bitterness preference isn't mis-estimated.
6. As a user who doesn't drink coffee, I want a sensible alternative question, so that the quiz doesn't waste a question on me.
7. As a user, I want options shown as plain text (optionally with a small icon), so that the choices feel friendly and clear — no emojis.
8. As a user with strong likes/dislikes, I want a short follow-up only when it matters, so that the quiz gets me right without dragging on.
9. As a user, I want to say how sweet vs dry and how light vs full I like my drinks, so that recommendations match my body/sweetness preference.
10. As a user, I want to express whether I want a few easy drinks or one strong one, so that recommendations respect my strength appetite.
11. As a user, I want to tap concrete flavor cues that are "me" at the end, so that I can sharpen my profile in a fun, optional way.
12. As a user, I want to skip the optional capstone, so that I can finish fast when I'm in a hurry.
13. As a user, I want a named persona and a taste radar when I finish, so that the result feels personal and worth sharing.
14. As a Hebrew-speaking user, I want my persona in Hebrew, and as an English-speaker in English, so that the payoff matches my language even if I switch later.
15. As a returning user whose profile predates the new model, I want to be guided to retake the improved quiz, so that my recommendations benefit from the richer model.
16. As a user, I want recommendations to reflect my strength preference even when I haven't set a session vibe, so that sessionless picks still fit me.
17. As a user who sets tonight's ABV intent, I want that choice to override my standing preference, so that the app respects my mood right now.
18. As a user, I want the radar and dials on my profile to reflect sweetness, body, and strength, so that I can see and trust what the app learned.
19. As a developer, I want the question flow defined as a pure, declarative graph, so that branching is testable without rendering UI.
20. As a developer, I want answer→dials/sentence scoring as pure functions, so that I can pin behavior with fast unit tests.
21. As a developer, I want the persona generator behind a mockable interface, so that onboarding tests stay deterministic.
22. As a developer, I want profile versioning, so that future model changes can re-gate stale profiles cleanly.
23. As a maintainer, I want the unused dial-editor endpoint removed, so that the surface stays coherent with the new model.

## Implementation Decisions

**Taste model (BaselineTaste).** Add `sweetness`, `body`, `abv_affinity` (each `0..1`) as
first-class dials alongside the existing `bubbles`, `bitterness`, `flavor_family` and
`NoveltyAffinity`. Add a `model_version` integer and a persisted bilingual persona
(title + blurb in `en` and `he`). `flavor_family` keys are unchanged.

**Profile versioning + forced re-quiz.** Existing rows backfill `model_version = 0`; the
current code writes the new version constant. The profile read exposes the version; the
home flow treats a below-current version (or no profile) as the create-profile state,
forcing the improved quiz once. Migration is non-destructive (new dial columns added with a
neutral default so the migration succeeds; the version gate means stale values are never
trusted).

**Adaptive quiz graph (Quiz Graph module).** A pure, declarative question pool with a
walker exposing `nextQuestion(answers)` and `isComplete(answers)`. Each question declares
its id, the answer field it sets, its option set, and an optional branch rule. Branches fire
only on extreme answers. Always-shown core ~7; coffee reframed around
black/milk/sweet/none with a conditional dark-chocolate confirm when coffee is ambiguous; a
"funky/wild" sour follow-up on "love it"; a CATA "what puts you off?" multi-select only on an
extreme avoid answer. An optional capstone flavor-cue grid is skippable.

**Scoring (Taste Composer module).** `compose_dials` maps the new answers: coffee sweetener
drives bitterness (black high, milk mid, sweet low); three-level adventurousness drives
NoveltyAffinity; the sweet-tooth question drives `sweetness` and `body` as two independent
dials; the strength question drives `abv_affinity` (session-strength *tolerance*, not
perceived intensity); capstone cues nudge `flavor_family`; CATA "avoid" answers nudge the
relevant dials down. `compose_text` becomes combination-aware — it builds one natural
sentence from the interaction of answers (this remains the dominant matching signal). All
new/branch/capstone answer fields are optional with neutral defaults so unasked paths
validate.

**ABV as a constraint (ABV Band Mapper module).** `abv_affinity` maps to a low/med/high
band (thresholds `<0.35` / `>0.65`). On a recommendation request with no session ABV intent
(or `any`), this band is applied via the existing ABV scoring term with the existing ABV
weight. An explicit session ABV intent always overrides. `abv_affinity` never enters the
cosine embedding (cosine ignores magnitude). The cosine path and the α/β baseline/session
merge are unchanged.

**Persona (Persona Generator module).** A dependency-injected generator produces a structured
result containing `en` and `he` title+blurb from the dials/answers, persisted on the
baseline at quiz time and on retake — never regenerated on view. Cosmetic only; never a
matching input. Injected and mocked like the existing embedding and icon clients.

**Quiz UI.** Convert onboarding from all-at-once to a one-question-at-a-time stepper driven
by the graph, with progress and back, using the standard page shell. Options render as text
with an optional catalog icon from the icon factory (reuse existing icon groups where they
fit; generate or add catalog keys otherwise; degrade to text-only when an icon is absent).
A multi-select variant supports the capstone grid. Results show the persona and an 8-axis
radar (bitterness, sweetness, body, hoppy, malty, roasty, sour, novelty); the radar also
appears on the home profile summary, and the dial list there gains sweetness/body.

**API contracts.** Rework the answer enums (coffee buckets; adventurousness as a three-level
enum replacing the boolean; new sweet/strength/choco/fizz enums; optional branch and capstone
enums). Add the new dials, `model_version`, and persona to the persisted-profile contract.
**Remove** the `PATCH` dial-editor endpoint and its request schema (no UI consumes it; the
dials→text helper it shared stays, since the recommendations debug path still uses it).
Regenerate the OpenAPI export and the web client types; verify no drift.

**Release.** Ship the slices atomically behind the `model_version` bump so no user is ever
blocked on a half-built quiz. Suggested slices: (1) taste model + DB migration + remove PATCH;
(2) scoring rework + ABV wiring; (2b) bilingual persona generator; (3) adaptive quiz graph +
stepper; (4) fun layer (text/SVG control, radar, persona display, capstone).

## Testing Decisions

Good tests assert external behavior, not implementation: given answers/inputs, assert the
observable dials, sentence shape, branch path, ranking effect, or persisted record — never
internal call order. Prior art: `apps/api/tests/test_baseline_taste.py` (pins dial outputs
for archetype answer sets) and `tests/test_onboarding_route.py` (route integration with
injected fakes); on the web side, the pure-function and component tests under
`apps/web/src/**` using the existing i18n render harness.

Modules to test (confirmed with developer):

- **Taste Composer** — distinct answer paths (black vs sweet vs milk-based coffee; high vs
  low strength; sweet-tooth) produce materially different dials and sentences; new dials land
  in expected ranges; optional/missing branch fields fall back to neutral.
- **Quiz Graph** — branch paths (coffee ambiguous → chocolate confirm; sour "love it" →
  wild; extreme avoid → CATA), the always-shown core stays small, and `isComplete` is true
  only when the resolved path is fully answered.
- **ABV Band Mapper** — threshold mapping; explicit session intent overrides the baseline
  band; a sessionless request honors the baseline band; cosine path unaffected.
- **Persona + Repo (integration)** — onboarding route with mocked persona generator and
  embedding persists `model_version`, both-language persona, and the new dials, and the
  profile read surfaces the version for stale-gating.

Lighter checks only (no dedicated suites required): the radar geometry helper (a pure
points function can have a small assertion) and the text/SVG quiz control (accessible
radiogroup semantics, as the current `QuizChips` already verifies).

## Out of Scope

- The rating→baseline feedback loop (deferred by ADR-0003): the quiz remains cold-start.
- An ester/yeast flavor dial (folded into `fruity` for v1).
- Optional free-text on onboarding.
- Rejected research directions (recorded so they are not revisited): 0–100 sliders/intensity
  meters, carbonation scored as a taste type, a spice/heat axis, and pairwise beer-vs-beer
  "flight" mechanics.
- A dial-editing UI (the `PATCH` endpoint is being removed, not surfaced).

## Further Notes

Forced re-quiz interrupts every current user on their next visit; acceptable at
pre-/early-launch scale, revisit if the active base grows. Research basis (for reviewers):
UK Biobank bitter-liking proxies, the Meilgaard beer flavor wheel (sweetness/body + ABV gaps),
forced-choice/MaxDiff and JAR/CATA sensory methods, and Vivino/Trade taste-profile patterns;
two research passes were reconciled with every claim web-revalidated.
