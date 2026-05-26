# PRD: Prelaunch Verification

## Problem Statement

Beerolog already has an explicit launch boundary and an explicit launch definition of done, but it does not yet have one durable artifact that defines how the team proves the supported MVP is safe to ship right before release. Today, launch confidence can still depend on scattered commands, partial manual checks, or someone's memory of what to verify in the deployed environment.

That gap is especially risky for the signed-in solo MVP because the most important failures happen at the seams between systems. Auth can work locally but fail in the deployed callback flow. Recommendations can return while explanations silently degrade. Persistence can appear correct in tests while the deployed database, migrations, or origins are misaligned. A release can also look "mostly fine" while known issues are handled inconsistently because there is no shared model for what is a true launch blocker versus what can be accepted as follow-up work.

## Solution

Define one launch-focused prelaunch-verification feature for the supported Beerolog MVP. This PRD turns the broader launch definition into a concrete release-evidence workflow with three required parts:

1. A fixed automated smoke baseline that must pass for the release candidate.
2. A fixed manual QA path that exercises the signed-in solo journey in a production-like deployed environment.
3. A release blocker model that distinguishes ship-stopping issues from acceptable documented follow-up work.

The feature stays verification-focused. It does not add new product scope, reopen deferred surfaces, or redesign the deploy stack. Its purpose is to make launch evidence repeatable, reviewable, and tied to the current supported MVP only.

## User Stories

1. As a release owner, I want one repeatable prelaunch verification flow, so that shipping the supported MVP does not depend on tribal knowledge.
2. As a maintainer, I want ADR 0001's signed-in solo boundary to remain the only scope for prelaunch verification, so that deferred venue, group, and social work does not become launch scope by accident.
3. As a reviewer, I want the release candidate to pass a fixed automated smoke baseline, so that obvious contract, type, lint, or API regressions block launch early.
4. As a release owner, I want the automated baseline to use real repo commands, so that the launch gate matches the way the codebase is already validated.
5. As a signed-in user, I want the deployed auth flow to work from sign-in through callback and back into the app, so that the supported journey is actually reachable at launch.
6. As a signed-in user, I want to complete the quiz or reuse my saved profile and still receive recommendations, so that both first-use and returning-user launch paths are verified.
7. As a signed-in user, I want recommendations to include readable explanations, so that the core product promise feels trustworthy at launch.
8. As a signed-in user, I want my persona, profile, and beer history to persist after refresh or later re-entry, so that the product behaves like a real account-backed experience.
9. As a QA operator, I want one defined manual path through the supported MVP, so that release checks are consistent across contributors.
10. As a support operator, I want manual verification failures to capture the step, environment, and request identifier when available, so that launch issues can be diagnosed instead of merely observed.
11. As a planner, I want a shared blocker model for launch, so that the team does not argue case-by-case about whether a failure should stop release.
12. As a maintainer, I want deferred-surface failures and minor cosmetic issues kept separate from launch blockers, so that launch readiness stays proportional to the supported MVP.
13. As a future collaborator, I want a durable launch evidence record for each release candidate, so that confidence is based on reviewable facts rather than chat history.

## Implementation Decisions

- ADR 0001 remains the authoritative product boundary for this PRD. Prelaunch verification applies only to the signed-in solo MVP: auth, quiz, recommendations, explanations, persistent profile, ratings/history, and persona.
- This PRD operationalizes the launch-definition-of-done PRD. It does not replace the broader launch bar; it defines the verification workflow and evidence required to satisfy that bar before release.
- Prelaunch verification must be tied to one named release candidate and one named target environment. Launch evidence is incomplete if it does not say what build, commit, or deploy was actually verified.
- Prelaunch evidence is only valid for the release candidate that was checked. Any material change to supported-surface code, API contracts, runtime configuration, provider configuration, or database migration state invalidates the affected evidence and requires re-verification before launch.
- The required automated smoke baseline for a release candidate is the existing root-level command set: `pnpm typecheck`, `pnpm lint`, and `pnpm test`.
- `pnpm test` is part of the launch gate because it includes both API verification and contract-sync verification. Contract drift between the API description and the web client schema is a release blocker, not a warning.
- A release candidate is not launch-ready if any required automated smoke command fails, is skipped, or is run against a different revision than the one being considered for launch.
- Automated smoke evidence should record the command, whether it passed, and when it was run. The point is durable release confidence, not a one-time console check that disappears after the session.
- Prelaunch verification must also include deployed runtime smoke for the target environment. At minimum, the target API health endpoint must respond successfully and the web app must be pointed at the intended API origin for that environment.
- Manual QA must run against a production-like deployed environment with real configured dependencies for the supported MVP. Local-only verification is useful but not sufficient for launch because auth redirects, CORS, secrets, migrations, and third-party providers are launch-critical.
- The authoritative manual QA path is the supported signed-in solo journey. The sequence is: open the deployed web app, sign in through Cognito hosted UI, return through the callback flow, complete the quiz if needed or reuse an existing saved profile, receive recommendations, confirm explanations render, view profile/persona state, submit at least one rating, and confirm persisted history/profile behavior after refresh or later re-entry.
- Manual QA must prove both "first supported use" and "returning supported use" behavior within the same supported surface. If the test account already has profile state, the verification path must still confirm that the returning-user path works correctly and that persistence remains intact after a new rating or profile update.
- Recommendation explanations are part of the supported MVP launch bar. Missing, materially broken, or misleading explanations in the supported recommendation flow are launch blockers unless the broader launch boundary is explicitly changed in follow-on planning.
- Persistence is part of the manual QA gate. It is not enough to see a successful request once; the verified release path must show that profile, persona, and history remain available after refresh or later re-entry.
- Manual verification must capture any user-visible failure with enough evidence to investigate it. At minimum, the evidence record should note the failed step, observed behavior, environment, approximate time, and the request ID if the failure exposes one.
- Launch blockers are issues that break, materially degrade, or make unsafe the supported signed-in solo journey. This includes failed automated smoke, broken auth, broken quiz-to-results flow, missing or misleading recommendations or explanations, missing persistence, contract drift, unsafe runtime configuration, failed health verification, or missing traceability needed to diagnose user-facing failures.
- Launch blockers also include issues that make the release evidence untrustworthy, such as stale verification after a material change, incomplete manual QA, or inability to tell which environment or revision was actually verified.
- Waiver candidates are limited to issues that do not break the supported MVP journey, do not create unsafe or misleading behavior, do not affect data integrity, auth, or launch-critical configuration, and are documented explicitly as accepted follow-up work.
- Deferred venue, scan, group, challenge, leaderboard, badge, and social surfaces are never launch blockers for this PRD unless the supported product boundary changes through a separate planning decision.
- Prelaunch verification requires one durable release evidence record under `docs/ops/releases/`. That record should summarize the release candidate, verified environment, automated smoke results, manual QA results, any captured request IDs or failure notes, and any explicitly accepted non-blocking issues.
- A release may ship only when the evidence record shows zero unresolved launch blockers. Shipping with waiver candidates is allowed only when they are explicitly documented as non-blocking and do not contradict the supported MVP boundary.

## Testing Decisions

- A good test for this PRD verifies release confidence at the behavior boundary. It should answer whether the supported MVP can be shipped safely, not whether an internal helper, checklist formatter, or implementation detail exists.
- Existing route, service, config, health, and contract-sync tests are the main prior art for the automated portion of this PRD. Prelaunch verification should continue to rely on those behavior-oriented checks instead of inventing a separate test universe for launch.
- The automated launch baseline stays intentionally small: repository type checking, linting, API tests, and contract verification. New automation is useful only when it materially improves confidence in the supported signed-in solo flow.
- Manual QA remains a required part of verification because deployed auth, provider configuration, CORS behavior, database migration state, and real persistence cannot be proven completely by the current automated suite alone.
- Manual verification should stay path-based rather than screen-based. The important thing is that the supported user journey succeeds end to end and leaves durable state behind, not that the UI happens to match an exact intermediate presentation.
- Release evidence should record the exact automated and manual checks that were run and their outcome. Evidence capture is part of verification quality, not optional administrative overhead.

## Out of Scope

- Expanding the supported MVP beyond the signed-in solo flow
- Reopening deferred venue, scan, group, challenge, leaderboard, badge, or social surfaces as launch requirements
- Rewriting the launch roadmap or modifying the roadmap plan file
- Requiring a full end-to-end browser automation suite before launch
- Building a full CI/CD orchestration system beyond the smoke baseline and release evidence this PRD requires
- Introducing new product features, analytics programs, admin tooling, or post-launch growth work
- Defining post-launch incident management, alert routing, or broader operational maturity work beyond the minimum launch evidence needed to ship safely

## Further Notes

This PRD is intentionally narrow. The launch-definition PRD says Beerolog needs verification evidence before release; this document defines what that evidence means for the supported MVP right before shipping.

If the supported product boundary expands later, or if the team decides that explanations, persistence, or other currently required launch behaviors should no longer be treated as blockers, that change should be made through a separate follow-on PRD and, if necessary, an ADR update rather than quietly weakening prelaunch verification.
