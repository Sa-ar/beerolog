# PRD: Quiz Polish

## Problem Statement

Beerolog's supported MVP depends on a signed-in solo user being able to move cleanly from the landing page into the quiz, finish the quiz with confidence, and arrive at recommendations that feel trustworthy. The current launch worktree already has that path in place, but the quiz experience is still underspecified as a launch-quality product surface. The home page still hints at group value, the quiz flow is optimized for speed more than resilience, and the transition into results can fail or mislead in ways that make the MVP feel less dependable than it needs to be for launch.

Without a focused PRD, "quiz polish" can drift in two bad directions. It can stay too vague and lead to piecemeal UX cleanup that misses key launch gaps like progress trust, answer editing, or invalid results recovery. Or it can sprawl outward into deferred venue, group, and challenge concepts that are not part of the supported MVP. The launch team needs one local definition of what it means to polish the signed-in solo quiz experience without reopening the broader roadmap.

## Solution

Polish the launch quiz as one durable signed-in solo journey that begins with solo-oriented entry messaging, continues through a clear and forgiving question flow, and ends with a reliable handoff into recommendations and saved profile state. The polished experience should make the quiz feel intentional rather than brittle: it should set expectations up front, report progress honestly even when questions are skipped dynamically, let the user correct themselves, survive simple interruptions like refreshes, and recover safely from invalid or failed result transitions.

This is a refinement PRD, not a scope-expansion PRD. It should preserve the current launch boundary and current recommendation/profile model while making the quiz journey feel ready for real launch users. The goal is not to add new recommendation modes, anonymous onboarding, venue context, or social loops. The goal is to make the supported signed-in solo quiz flow trustworthy, resilient, and clearly framed as the core Beerolog launch experience.

## User Stories

1. As a first-time visitor, I want the home page to describe Beerolog as a solo taste-learning product, so that I am not promised deferred group functionality.
2. As a signed-out visitor, I want to understand that signing in is required before my quiz results can be saved, so that the auth requirement feels expected rather than surprising.
3. As a signed-in user, I want the quiz entry experience to tell me what the quiz does and how long it will take, so that I feel comfortable starting it.
4. As a signed-in user, I want to answer one question at a time with clear progress, so that I know where I am in the flow.
5. As a signed-in user, I want the progress indicator to reflect the real active question count after skip logic applies, so that the flow does not feel inconsistent or dishonest.
6. As a signed-in user, I want to go back and change a prior answer, so that one mistaken tap does not force me to restart from scratch.
7. As a signed-in user, I want to restart the current quiz attempt deliberately, so that I can begin again when my intent changes.
8. As a signed-in user, I want my in-progress answers to survive a refresh or short interruption, so that the quiz does not feel fragile.
9. As a signed-in user, I want completed quiz answers to lead into a loading state that clearly explains what Beerolog is doing, so that the transition into recommendations feels reliable.
10. As a signed-in user, I want recommendation retrieval failures to be recoverable without re-answering the entire quiz, so that temporary errors do not erase my effort.
11. As a signed-in user, I want invalid or incomplete results entry to send me back into a safe quiz recovery path, so that I never see recommendations that were not actually based on my answers.
12. As a returning user, I want retaking the quiz to refresh my current taste profile intentionally, so that I can get new picks without ambiguity about which profile is current.
13. As a maintainer, I want quiz polish scoped to the signed-in solo launch flow, so that deferred venue, group, and challenge ideas do not leak back into the MVP.
14. As a reviewer, I want clear non-goals for quiz polish, so that launch work can be evaluated against a stable boundary instead of opinion.

## Implementation Decisions

- ADR 0001 remains the authoritative scope boundary for this PRD. Quiz polish applies only to the signed-in solo launch journey.
- The launch quiz experience begins at the landing-page call to action and sign-in handoff, and it ends when a completed quiz successfully hands off to recommendations and the current profile state is saved.
- Home-page and sign-in messaging must describe the supported solo value proposition only. They must not imply that group recommendations or deferred shared flows are part of launch.
- The quiz remains a short preference-capture flow built on the current question-bank and skip-logic model. This PRD does not expand the question set into venue, scan, challenge, or operator contexts.
- The in-flow progress indicator and question count must reflect the real active-question path after skip rules apply. Launch copy may describe the quiz as short, but the step indicator itself must stay honest to the current run.
- The quiz flow should support deliberate backward navigation for answer editing and a deliberate restart action for abandoning the current attempt.
- In-progress quiz state should be stored client-side and scoped to the authenticated user. Launch does not require server-side draft persistence or cross-device resume.
- A quiz attempt is complete only when all active questions for that attempt have been answered. Only then may the app derive the `FlavorVector` and transition to results.
- Completed quiz state must be the only supported input to the results handoff. Missing, invalid, or incomplete results state should route the user back to quiz recovery instead of silently producing neutral or generic recommendations.
- Successful quiz completion should continue to update the user's current taste profile before recommendations are shown. Partial or in-progress quiz answers must never overwrite the saved profile.
- If the profile-save or recommendation step fails after quiz completion, the user should be able to retry from the completed attempt without re-answering the quiz.
- Retaking the quiz is an allowed launch action. The latest successfully completed quiz becomes the user's current taste profile for subsequent recommendations and persona/history views.
- Quiz branching, completion, resume, and recovery rules should stay concentrated in reusable state helpers rather than being spread across route-only conditionals.

## Testing Decisions

- A good test for this PRD verifies user-visible quiz behavior: honest progress, resilient answer flow, correct completion gating, and safe recovery when the result handoff breaks.
- Automated coverage should focus on pure quiz-state behavior such as active-question derivation, skip-aware progress, answer editing, completion eligibility, and resume-or-clear behavior for in-progress attempts.
- Route-level verification should cover signed-out redirects, signed-in resume behavior, successful completion handoff, retry behavior after post-quiz request failures, and recovery behavior when results are opened with invalid or missing completion state.
- Manual smoke testing should cover the supported solo flow from home to sign-in to quiz to results, plus refresh-during-quiz, retry-after-failure, invalid-results recovery, and retake-quiz behavior from a returning-user surface.
- Prior art should continue to follow the repo's existing behavior-first testing style: route and service tests that validate external outcomes, plus isolated logic tests for small pure helpers where branching behavior matters.
- New verification should stay scoped to the launch quiz journey. This PRD does not require new broad E2E infrastructure for deferred or unrelated product surfaces.

## Out of Scope

- Reopening venue QR, tap-list, menu-scan, group-session, challenge, leaderboard, badge, social-proof, or operator flows
- Adding an anonymous or signed-out recommendation flow
- Redesigning the recommendation engine, persona model, beer catalog, or taste-vector schema
- Adding server-backed quiz drafts, cross-device resume, or long-term onboarding history beyond the current launch need
- Expanding the quiz into a broader onboarding wizard for sharing, growth loops, or lifecycle messaging
- Rewriting the roadmap artifact or doing the follow-on issue-slicing work inside this PRD document; approved execution should create local slices under `docs/issues/quiz-polish/`
- Major visual rebranding beyond the polish needed to make the launch quiz journey coherent and trustworthy

## Further Notes

Quiz polish is primarily about trust. A launch user should understand what the quiz is for, feel oriented while answering it, and never lose confidence that the results came from their explicit choices.

Because the supported MVP is signed-in and solo, this PRD intentionally uses that constraint to simplify decisions. Resume behavior can stay local to the signed-in browser session, and the surrounding copy can focus on personal recommendations and saved profile evolution without reopening any deferred collaborative surface.
