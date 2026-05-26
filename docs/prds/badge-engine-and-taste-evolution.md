# PRD: Badge Engine and Taste Evolution

## Problem Statement

Beerolog's launch boundary is intentionally narrow: the signed-in solo flow covers auth, quiz, recommendations, persistent profile, ratings/history, and persona, while badges, milestones, and broader social or venue gamification stay deferred. That keeps launch focused, but it leaves an important post-launch planning gap.

The repository already contains roadmap language and early helper logic for badges and taste evolution. Without a dedicated post-launch PRD, later planning can collapse several different concerns into one vague "badge system" effort: durable achievements, progress milestones, and the user's evolving taste story. That ambiguity creates three risks. First, follow-on work can accidentally pull venue or social dependencies back into near-term scope. Second, taste evolution can get reduced to a single threshold badge instead of a meaningful profile feature. Third, implementation can hard-code one-off badge checks instead of defining a reusable engagement surface that fits Beerolog's existing profile, ratings, and history model.

## Solution

Define badges, milestones, and taste evolution as explicit post-launch follow-on work, with clear boundaries between them and clear dependencies on the launch-first product boundary.

This PRD establishes three separate roadmap surfaces:

1. Badge surface: durable earned achievements that appear in a user's collection and can be referenced later.
2. Milestone surface: progress checkpoints, nudges, and near-term progress states that help a user understand what they are working toward.
3. Taste-evolution surface: a profile experience that explains how a user's flavor preferences have changed over time, using stored profile snapshots and meaningful before-versus-now summaries.

The first post-launch execution wave should stay anchored to the signed-in solo data that already exists at launch: user profile state, beer ratings/history, persona, and flavor-vector updates. Venue-scoped and friend-dependent achievements remain follow-on work for later PRDs, because those surfaces are still deferred by the launch boundary and depend on additional product reopening.

This PRD is a post-launch planning artifact only. It does not expand launch scope, and it does not change the accepted rule that deferred surfaces must be reopened intentionally before they become implementation requirements.

## User Stories

1. As a roadmap owner, I want badge, milestone, and taste-evolution work split into separate follow-on surfaces, so that post-launch planning does not blur distinct product problems together.
2. As a contributor, I want this PRD to say explicitly that the work is post-launch only, so that nobody treats gamification as part of launch readiness.
3. As a product designer, I want badges to represent durable earned achievements, so that the collection feels meaningful instead of transient.
4. As a product designer, I want milestones to represent visible progress toward a goal, so that users get feedback before they earn a permanent badge.
5. As a user, I want to see progress against post-launch milestones based on my signed-in solo activity, so that returning to the app feels purposeful.
6. As a user, I want earned badges to persist on my profile, so that I can see what I have accomplished over time.
7. As a user, I want taste evolution shown as a story of how my profile changed, so that I understand how Beerolog is learning me rather than just storing ratings.
8. As a user, I want my taste evolution to be based on actual profile history rather than a one-time comparison only, so that the result feels trustworthy.
9. As a user, I want taste evolution moments to be surfaced when they are meaningful, so that I am not spammed with noise after every small rating change.
10. As a backend developer, I want a reusable badge and milestone engine rather than one-off helper functions, so that new post-launch achievements can be added without rewriting logic in multiple places.
11. As a frontend developer, I want badges, milestones, and taste evolution to have distinct read models, so that the UI can explain earned achievements, in-progress goals, and profile change without forcing one component to do all three jobs.
12. As a maintainer, I want the first post-launch wave to rely only on launch-supported solo data, so that follow-on work can ship without reopening venue or social scope.
13. As a future feature owner, I want venue-based and friend-based achievements kept in separate later follow-on work, so that their dependencies stay explicit.
14. As a reviewer, I want this PRD to clarify what counts as a badge, a milestone, and taste evolution, so that later issue slicing uses consistent language.
15. As a tester, I want the rules for awarding achievements and detecting evolution to be externally observable and deterministic, so that the system can be verified without depending on implementation details.
16. As a user, I want milestone progress and earned badges to feel tied to my real beer journey, so that the feature reinforces learning rather than feeling like generic gamification.
17. As a planner, I want the system to support additional achievement families later, so that Beerolog can add venue or social badges without replacing the solo foundation.
18. As a release decision-maker, I want this PRD to preserve the launch-first boundary while still defining the next engagement surface, so that the roadmap can progress without scope confusion.

## Implementation Decisions

- This PRD defines post-launch follow-on work only. It does not reopen the launch boundary, and it must not be cited as a launch requirement.
- Badge, milestone, and taste evolution are separate product surfaces and should not be implemented as one combined concept.
- A `badge` is a durable earned achievement with a stable identity, earned-at timestamp, and user-visible description.
- A `milestone` is a progress checkpoint or prompt tied to movement toward a goal. Milestones may lead to a badge, but they are not the same thing as badge ownership.
- `Taste evolution` is a profile-history surface that explains longitudinal change in a user's flavor preferences. It is not just a badge threshold and should remain useful even when no new badge is awarded.
- The first post-launch badge and milestone wave should only use signals already produced by the launch-supported solo flow: persisted profile state, beer ratings/history, persona changes, and flavor-vector updates.
- The first post-launch wave should introduce a reusable achievement foundation that persists earned badges, current milestone progress, and the evidence needed to explain why something was awarded.
- Achievement evaluation should be idempotent and event-driven from user activity that already updates the solo profile loop, rather than relying on manual one-off recalculations scattered across the product.
- Taste evolution should use stored profile snapshots over time, including an initial baseline and later checkpoints after meaningful profile-changing events, so that the product can show more than a single before-versus-current comparison.
- The user-facing taste-evolution surface should summarize both cumulative drift and dimension-level movement in plain language, so that profile change is explainable rather than numeric only.
- Badge collection, milestone progress, and taste-evolution history should be represented as separate read surfaces in the product, even if they share underlying profile data.
- The existing lightweight badge helper logic in the repository should be treated as exploratory prior art, not as the final product contract for post-launch behavior.
- Venue-based badge families such as venue exploration or "first to try a tap" remain blocked on a later venue-surface PRD, because they depend on venue inventory and venue-timestamp authority that are outside launch scope.
- Friend- or social-proof-based badge families remain blocked on later social-surface PRDs, because they depend on friend graph, recommendation attribution, and privacy-aware social evidence that are outside launch scope.
- The first issue-slicing pass after this PRD should create separate implementation tracks for: achievement foundation, solo milestone experience, and taste-evolution experience.
- Any future expansion into venue or social achievement families should be done through dedicated follow-on PRDs that explicitly reopen those surfaces instead of silently extending this one.
- This PRD does not change the `FlavorVector` contract. Taste evolution must adapt to the existing schema versioning rules rather than redefining the vector shape.

## Testing Decisions

- A good test for this PRD verifies external behavior: when a user performs supported solo actions, progress advances predictably, badges are awarded exactly once when criteria are met, and taste evolution summaries reflect stored profile history accurately.
- Tests should focus on deterministic outcomes from user activity and stored snapshots, not on internal helper structure or implementation-specific timing details.
- The achievement foundation should be tested for idempotent evaluation, correct badge issuance, correct milestone progress updates, and clear evidence attached to awards.
- The milestone surface should be tested for monotonic progress behavior, correct threshold crossing, and correct empty or partial states for users with limited history.
- The taste-evolution surface should be tested by comparing profile snapshots across time and verifying that meaningful changes produce stable summaries while minor noise does not create false evolution events.
- Tests should confirm that a user can have taste-evolution history without earning a new badge, and can earn a badge without forcing a new taste-evolution milestone, since those surfaces are intentionally separate.
- Tests should also confirm that venue-dependent and social-dependent achievement rules do not activate in the first post-launch wave when their prerequisite surfaces are absent.
- Prior art should come from the repo's existing pure service-module style, in-memory repository testing pattern, and deterministic profile-related tests already used for recommendation, feedback, and persona behavior.

## Out of Scope

- Expanding launch scope or changing launch readiness criteria
- Reopening venue, scan, challenge, leaderboard, or broader social surfaces
- Treating venue-explorer, first-timer, or friend-expert achievements as part of the first post-launch implementation wave
- Changing the roadmap plan file or rewriting the approved launch plan
- Creating GitHub issues or syncing this PRD to an external tracker
- Redefining the `FlavorVector` schema or changing the recommendation/profile core loop
- Building a public social-sharing or growth-distribution strategy around badges in this PRD
- Designing every future badge family in detail before the achievement foundation exists

## Further Notes

This PRD is intentionally narrower than the original long-range Beerolog vision. The goal is not to re-import every badge idea from the broader roadmap. The goal is to define a clean post-launch engagement layer that grows from the signed-in solo loop first, then leaves room for later venue and social achievement families when those product surfaces are reopened on purpose.

The most important boundary in this document is conceptual: badges, milestones, and taste evolution should reinforce one another, but they should not collapse into one overloaded feature. Badges answer "what have I earned?", milestones answer "how am I progressing?", and taste evolution answers "how has my palate changed?". Keeping those questions separate will make later issue slicing, service design, and UI behavior substantially clearer.
