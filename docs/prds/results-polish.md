# PRD: Results Polish

## Problem Statement

Beerolog's signed-in solo flow already produces ranked recommendations, but the launch results experience still feels like a thin API handoff instead of the product's payoff moment. After a user finishes the quiz, the current screen saves their profile, renders three recommendation cards, and offers only a narrow next step. That is functional, but it does not yet create enough confidence, clarity, or momentum for a launch-quality recommendation experience.

That gap creates four launch risks. First, users may not fully understand why each beer was chosen or how the three recommendation slots differ. Second, the screen does not yet reinforce the value of being signed in strongly enough; profile saving happens, but the payoff is only lightly expressed. Third, the learning loop is too shallow on the results screen because feedback capture is centered on only the top pick instead of the presented set. Fourth, loading, fallback, and retry behavior are serviceable but not yet polished enough for the core signed-in MVP moment.

## Solution

Polish the signed-in solo recommendation results screen into a trustworthy, action-oriented destination that clearly explains Beerolog's picks, reinforces that the user's taste profile has been saved, and makes the next best actions obvious. The experience should preserve the existing launch recommendation shape: one best pick, one safer backup, and one more adventurous option, each backed by concise explanation copy and lightweight supporting metadata.

The results experience should feel intentionally productized without expanding scope. It should improve explanation quality, slot clarity, saved-profile confidence, results-specific rating behavior, and launch-grade loading and error states. It should stay within the supported solo MVP by building on the current recommendation, explanation, persona, and rating capabilities rather than reopening venue, scan, group, or social surfaces.

## User Stories

1. As a signed-in user, I want the results page to feel like the payoff for taking the quiz, so that Beerolog immediately feels useful rather than prototype-like.
2. As a signed-in user, I want each recommendation slot to have a clear role, so that I understand the difference between my safest match, my fallback option, and my stretch pick.
3. As a signed-in user, I want every shown beer to include a readable explanation, so that I trust why it was recommended.
4. As a signed-in user, I want explanations to stay helpful even when the explanation generator has a degraded response, so that the screen never feels broken or empty.
5. As a signed-in user, I want the results screen to confirm that my profile has been saved and will improve over time, so that being signed in feels meaningful.
6. As a signed-in user, I want a lightweight view of my emerging taste identity on the results screen, so that the recommendations feel connected to my longer-term Beerolog profile.
7. As a signed-in user, I want to rate any recommendation I am considering, so that I can teach Beerolog from the same moment I receive my picks.
8. As a signed-in user, I want rating feedback on the results screen to acknowledge that my profile is updating, so that the learning loop feels responsive.
9. As a signed-in user, I want clear next steps after viewing my results, so that I know whether to explore my profile or retake the quiz for fresh picks.
10. As a signed-in user, I want launch-quality loading and retry states, so that transient failures do not undermine confidence in the core recommendation flow.
11. As a frontend developer, I want the results experience to build on the existing signed-in solo APIs, so that polish work does not quietly become a broader recommendation redesign.
12. As an API developer, I want the recommendation contract to stay centered on ranked slots and explanation copy, so that launch polish does not reopen unrelated backend work.
13. As a reviewer, I want this PRD to keep results polish inside the signed-in solo MVP boundary, so that deferred venue, scan, and social ideas do not creep back into launch.
14. As a release owner, I want the launch recommendation moment to feel polished without requiring a new product surface, so that the team can improve perceived quality without expanding scope.

## Implementation Decisions

- ADR 0001 and the launch scope freeze PRD remain the governing boundary for this work. `results-polish` applies only to the signed-in solo recommendation results experience.
- The authoritative results shape remains three ranked solo slots: `best`, `backup`, and `adventurous`. This feature improves how those slots are presented, not how many recommendation modes Beerolog supports.
- The results screen should explain the slot roles in user-facing language, but it should not expose raw scoring internals or recommendation-engine math.
- Every rendered recommendation card must have explanation copy. Blank explanation regions are not acceptable in the launch results experience.
- Explanation copy should be concise, specific, and confident. It should connect the beer to the user's taste profile in plain language rather than sounding generic or speculative.
- Fallback explanations remain acceptable for resilience, but the fallback copy should still read like intentional product copy rather than an error placeholder.
- The results screen should explicitly reinforce that the signed-in user's current taste profile was saved before recommendations were shown.
- The results screen may include a lightweight persona or taste-summary element if available, but that summary should remain private and in-product. This feature does not introduce sharing, social proof, or comparison behavior.
- Persona context for results polish should come from the existing user-profile/persona capabilities rather than expanding the recommendation response into a broader cross-surface payload.
- Results polish should deepen the feedback loop on the results screen by letting the user rate any presented recommendation, not only the top pick.
- Rating from the results screen should use the existing signed-in rating flow and acknowledge that the user's profile is updating, but it should not silently rerank or replace the current set of recommendations in place after a single rating.
- The primary results next steps remain reviewing the user's profile and retaking the quiz for a fresh set of picks. Results polish should make those paths clearer, not add new launch destinations.
- Loading, empty, degraded, and retry states for the results experience are part of the feature scope. The launch results moment should remain understandable even when recommendation or explanation dependencies fail transiently.
- The recommendation service should remain focused on ranking beers for the signed-in solo catalog, and the explanation service should remain focused on producing per-beer supporting copy. `results-polish` is not a mandate to redesign scoring, flavor vectors, or model selection.
- No venue metadata, menu-scan context, tap-list context, group-session context, challenge context, leaderboard context, badge context, or social-proof context should be introduced into the results experience for launch.
- No roadmap artifact is changed by this PRD. This document only clarifies the launch-quality bar for the existing results surface.

## Testing Decisions

- A good test for this PRD validates externally visible results behavior: the user receives understandable recommendations, resilient explanations, clear next steps, and an obvious signed-in learning loop.
- Web verification should focus on behavior of the signed-in results experience rather than styling details. Tests should prefer stable user-observable outcomes over brittle snapshot assertions.
- Results-focused web coverage should verify the launch states that matter most: loading, successful three-slot rendering, degraded explanation fallback, retryable failure handling, and results-specific rating entry points.
- If persona context is shown on the results screen, tests should verify that it appears only as a lightweight in-product summary and does not introduce share or comparison behavior.
- API and service verification should continue to rely on behavior-oriented recommendation and explanation tests that prove ranked slots and non-empty explanation output for shown beers.
- Existing recommendation route tests and explanation service tests are the main prior art for backend behavior. They already validate ranked slot responses and graceful explanation fallback, and results polish should build on that pattern rather than replacing it.
- Any new tests for rating behavior from results should confirm that the signed-in rating flow is reachable for presented picks and that success feedback is shown without depending on private component internals.
- Manual smoke verification should include the full signed-in solo payoff moment: finish the quiz, land on results, understand the slot framing, read explanations, confirm the saved-profile signal, rate a shown beer, and navigate onward to profile or a fresh quiz.
- Verification should also confirm that deferred surfaces remain absent from the results screen even if related code exists elsewhere in the repository.

## Out of Scope

- Reworking the recommendation algorithm, flavor-vector model, or slot-selection math
- Expanding Beerolog beyond the signed-in solo launch flow
- Reopening venue, tap-list, menu-scan, group-session, friend challenge, leaderboard, badge, or social-proof work
- Adding social sharing, comparisons, invites, or multiplayer behavior to the results screen
- Redesigning the profile route beyond any narrow results-to-profile handoff needed for clarity
- Introducing a new backend recommendation mode, discovery feed, or broader catalog-browsing surface
- Rewriting the roadmap plan or using this PRD to change launch sequencing outside the results experience

## Further Notes

This PRD defines the launch-quality bar for Beerolog's recommendation payoff moment, not a new product area. The point is to make the signed-in solo results experience feel clear, confident, and worth acting on while staying inside the already-approved MVP boundary.

If Beerolog later wants the results screen to include venue-aware context, social comparison, shared personas, or other broader discovery surfaces, that should start with a separate PRD that explicitly reopens the product boundary rather than treating those ideas as polish.
