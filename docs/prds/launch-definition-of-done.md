# PRD: Launch Definition of Done

## Problem Statement

Beerolog now has a clear launch-first product boundary, but it does not yet have a durable definition of what "launch-ready" means for that supported MVP. Without that definition, the team can mistake partial product completeness for true release readiness, ship with unresolved operational gaps, or accidentally treat deferred roadmap surfaces as launch blockers.

The missing definition creates risk in five areas. Product behavior can be incomplete even if core routes exist. Runtime setup can look correct in development but still fail in production because environment, auth, CORS, secrets, or migrations are not aligned. Documentation can lag behind the real deploy path. Verification can be inconsistent across contributors. Operators can be left without enough confidence to support real users once the app is live.

## Solution

Define one local, durable launch gate for the supported Beerolog MVP. This PRD makes launch readiness explicit for the signed-in solo flow and treats launch as more than "the app runs." A release is considered launch-ready only when five categories are satisfied together:

1. Product behavior works for the supported user journey.
2. Runtime dependencies and production configuration are ready.
3. Launch and support documentation are complete enough to operate the system.
4. Verification evidence exists for both automated checks and manual smoke coverage.
5. Operators have enough observability and context to diagnose user-facing failures.

This PRD is intentionally release-focused, not expansion-focused. It does not add new product scope. It defines the criteria required to launch the already-supported MVP reliably.

## User Stories

1. As a roadmap owner, I want one explicit launch gate for the supported MVP, so that release decisions are based on consistent criteria instead of intuition.
2. As a maintainer, I want the signed-in solo flow to remain the only supported launch surface, so that deferred venue, group, challenge, and social work does not quietly become part of launch scope.
3. As a signed-in user, I want to complete the quiz and receive recommendations successfully, so that the core Beerolog promise works at launch.
4. As a signed-in user, I want my profile, persona, and beer history to persist across sessions, so that the app feels reliable rather than disposable.
5. As a signed-in user, I want rating a beer to update my ongoing taste profile, so that Beerolog improves as I keep using it.
6. As a user, I want recommendation results to include readable explanations, so that the output feels trustworthy and understandable.
7. As an operator, I want the web app, API, auth provider, database, and model provider configured with production values, so that the supported MVP can run outside local development.
8. As an operator, I want health checks, request identifiers, and request logs available at launch, so that I can investigate failures without guessing.
9. As a support person, I want a release checklist and runtime notes, so that I know what was verified before launch and how to debug common problems after launch.
10. As a contributor, I want launch criteria to include documentation quality, so that the release process is repeatable by someone other than the original author.
11. As a reviewer, I want automated verification and contract checks to be part of launch readiness, so that the deployed surface matches the documented surface.
12. As a product owner, I want known launch blockers to be defined clearly, so that non-critical follow-up work does not delay release unnecessarily.
13. As a developer, I want launch evidence to cover the supported end-to-end journey, so that passing unit and route tests alone do not create false confidence.
14. As a planner, I want this PRD to stay focused on release readiness, so that roadmap planning for future surfaces happens in separate follow-on work.

## Implementation Decisions

- ADR 0001 is the authoritative scope boundary for this PRD. Launch readiness applies only to the signed-in solo flow: auth, quiz, recommendations, persistent profile, ratings/history, and persona.
- Deferred venue, scan, group, challenge, leaderboard, badge, and social surfaces are explicitly not launch requirements. They may remain in the repository as follow-on work without blocking launch.
- Launch readiness is a multi-category gate. A release is not done if any one of these categories is missing: product behavior, runtime readiness, documentation readiness, verification evidence, or operator confidence.
- Product behavior is launch-ready only when a signed-in user can complete the intended journey end to end: authenticate, complete the quiz, receive recommendations, view persona/profile state, rate beers, and later retrieve persisted history/profile state.
- The authoritative recommendation flow remains the solo signed-in path backed by the existing recommendation endpoint and current taste-profile model. Launch readiness does not require a broader discovery surface or additional recommendation modes.
- Recommendation explanations are part of the supported MVP experience and therefore part of the launch gate. If explanations are unavailable or materially broken in the supported flow, launch readiness is not met.
- Persistence is part of the launch gate. Launch readiness requires production-backed storage for users, profiles, ratings/history, and profile evolution behavior, not only in-memory development overrides.
- Runtime readiness requires production configuration for the web deployment, API deployment, database connection, Clerk integration, and OpenAI access. Local defaults and placeholder secrets do not satisfy the launch gate.
- `API_SECRET` must be set to a strong non-default value before launch. Default development values are never acceptable for a live release.
- Production auth readiness requires the supported social provider OAuth credentials, Clerk publishable key, Clerk secret key, and API-side Clerk token verification settings to be aligned with the live web origin (see `docs/prds/clerk-social-auth-foundation.md`).
- Production API readiness requires the launch database to be migrated before release and the API health endpoint to return a healthy response from the deployed environment.
- Cross-origin readiness is part of launch readiness. The allowed browser origins configured for the API must match the web origins that the team intentionally supports for launch.
- Contract integrity is part of launch readiness. The OpenAPI description and generated web client schema must be in sync at release time so the documented API surface matches the shipped frontend expectations.
- Documentation readiness requires a current operator-facing path for local setup, production deployment, environment configuration, and post-deploy checks. Launch should not depend on private memory or chat-only instructions.
- Documentation readiness also requires explicit supported-versus-deferred language so launch artifacts do not imply that broader roadmap surfaces are live.
- Verification evidence must include both automated checks and manual release validation. Passing automated checks alone is necessary but not sufficient for launch.
- Automated launch verification should cover repository type checking, linting, API tests, and contract synchronization checks.
- Manual launch verification should cover the supported production-like user journey: sign-in, quiz completion, recommendation retrieval, explanation rendering, profile retrieval, rating submission, persona availability, and persisted history/profile behavior after refresh or re-entry.
- Operator confidence requires enough observability to diagnose failures in the live system. At minimum, launch must preserve request logs, health checks, request IDs, and a clear path for correlating user-visible failures with API logs.
- The release decision should include a short, durable launch evidence record summarizing what automated checks passed, what manual smoke steps passed, what environment was validated, and what known non-blocking issues were accepted.
- Known issues are acceptable only if they do not break the supported MVP journey, do not create unsafe or misleading behavior for launch users, and are documented explicitly as post-launch follow-up work.

## Testing Decisions

- A good test for this PRD validates externally visible launch behavior and release confidence, not internal implementation details. The important question is whether the supported MVP is launchable and operable, not whether a specific helper or internal abstraction exists.
- Automated verification for launch should continue to lean on behavior-oriented route and service tests for recommendations, profile persistence, ratings/history, persona, health, and contract generation.
- Existing API route and service tests are the main prior art for behavior checks. They should remain focused on request/response behavior, persistence expectations, and recommendation/profile outcomes rather than private internals.
- Existing contract synchronization checks are prior art for keeping the documented API and generated frontend schema aligned. Launch readiness should continue to treat contract drift as a release blocker.
- Repository-wide type checking and linting are part of launch verification because they provide a baseline signal that the supported web and API surfaces still build and agree with their declared contracts.
- Manual smoke testing remains necessary even with strong automated coverage because launch readiness depends on deployed auth, environment, CORS, secrets, migrations, and third-party integrations that unit and route tests do not fully exercise.
- Manual smoke coverage should verify the signed-in solo flow from login through persisted post-rating state, using a production-like environment and real configured dependencies.
- Release evidence should capture the exact checks performed and whether each one passed, so future operators can tell what level of confidence existed at launch time.
- New automated work that improves launch confidence is welcome only when it stays focused on the supported MVP. This PRD does not require broad new test infrastructure for deferred surfaces.

## Out of Scope

- Expanding the supported MVP beyond the signed-in solo flow
- Treating deferred venue, scan, group, challenge, leaderboard, badge, or social surfaces as launch requirements
- Redesigning recommendation logic, persona logic, or the flavor-vector model
- Adding new product features, growth loops, admin tooling, or analytics requirements
- Rewriting the roadmap or changing the approved launch-first product boundary
- Defining every follow-on execution slice inside this PRD; approved work should create local slices under `docs/issues/launch-definition-of-done/`
- Requiring new observability vendors or complex support tooling beyond the launch-critical logs, health signals, and traceability already expected by the current architecture

## Further Notes

This PRD defines the release bar for the current Beerolog MVP; it does not decide the next roadmap expansion. If the supported product boundary changes later, that change should be captured in a separate PRD and follow-on ADR rather than folded into launch-readiness criteria.

The launch gate should be interpreted conservatively. If the signed-in solo flow works only in development, if production configuration is incomplete, if contracts drift, or if operators cannot diagnose failures with the available runtime signals, the product is not launch-ready yet.
