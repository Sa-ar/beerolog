# PRD: Local Demo Flow

## Problem Statement

Beerolog's supported MVP is the signed-in solo flow, but the exact local setup and walkthrough for exercising that MVP are still spread across multiple READMEs, service notes, and implementation details. A contributor can tell that the app needs web, API, auth, database, and model-provider wiring, yet still lose time figuring out which dependencies are actually required for a working local demo, which routes are authoritative, whether any data seeding is needed, and which deferred surfaces should be ignored.

That gap creates three kinds of demo risk. First, a maintainer can waste time on repo archaeology or try to boot unsupported paths. Second, a local run can appear partially healthy while still being unable to complete the signed-in solo journey because Clerk, Neon, OpenAI, migrations, or CORS are not aligned. Third, different contributors can demo different flows and accidentally treat deferred venue, group, challenge, or social work as part of the supported local surface.

## Solution

Define one durable local-demo-flow PRD for the supported Beerolog MVP only. This PRD should state the minimum local setup needed to exercise the signed-in solo journey, the exact external services that must be configured, the local runtime commands that must be used, and the canonical manual walkthrough that proves the MVP is working end to end.

The goal is not to redesign launch auth, runtime hardening, or deploy process. The goal is to make today's supported local demo explicit and repeatable. A contributor should be able to follow one documented path, start the local web and API runtimes, sign in through Clerk (one of the supported social providers), complete the quiz, receive recommendations with explanations, rate a beer, and confirm that profile, persona, and history persist without needing extra repository archaeology.

## User Stories

1. As a maintainer, I want one authoritative local demo contract for the signed-in solo MVP, so that I do not have to reconstruct the setup from scattered docs and source files.
2. As a new contributor, I want to know exactly which providers must be configured locally, so that I do not waste time booting the app with missing prerequisites.
3. As a demo operator, I want one canonical startup sequence for the web app, API, and database-backed persistence, so that I can reach a working state predictably.
4. As a demo operator, I want to know which environment values matter for local success, so that auth, CORS, persistence, and recommendation explanations all work together.
5. As a signed-in user, I want the local demo to start from a real sign-in flow, so that profile, persona, and history behavior match the supported MVP rather than a fake local shortcut.
6. As a signed-in user, I want the quiz to hand off into saved recommendations, so that the app feels like one continuous journey rather than disconnected screens.
7. As a signed-in user, I want recommendation results to include readable explanation text, so that the local demo reflects the supported product promise.
8. As a signed-in user, I want rating a beer to affect my saved state and history, so that the local demo proves Beerolog learns over time.
9. As a returning user, I want my persona and history to still exist after refresh or re-entry, so that the local demo proves persistence instead of temporary browser-only state.
10. As a reviewer, I want the local demo artifact to stay tightly scoped to the signed-in solo MVP, so that deferred venue, scan, group, challenge, leaderboard, badge, and social work do not creep back into the definition of done.
11. As a collaborator, I want to know whether seed data or catalog bootstrapping is required locally, so that I do not perform unnecessary setup.
12. As an operator, I want one short smoke flow with clear pass criteria, so that I can tell whether the supported MVP is truly working locally.
13. As a planner, I want this PRD to document the current supported local path without reopening broader launch architecture work, so that local demo enablement stays focused.

## Implementation Decisions

- ADR 0001 remains the governing boundary for this PRD. `local-demo-flow` applies only to the supported signed-in solo MVP: sign-in, quiz, recommendations, persistent profile, ratings/history, and persona.
- The authoritative local demo surface is limited to the current solo web journey and its supporting API endpoints. Deferred venue, scan, session, challenge, leaderboard, badge, and social routes are not part of the supported local walkthrough even if related code remains in the repository.
- The minimum required local dependencies are Node and pnpm for the web and workspace tooling, Python and `uv` for the API runtime, a Clerk development instance (free tier), one Neon PostgreSQL database, and one OpenAI API key.
- Local setup must include installing workspace dependencies, creating the API and web environment files from the checked-in examples, synchronizing the API Python environment, and applying database migrations before the walkthrough begins.
- The required local runtime contract is explicit: the web app uses the local API base URL plus the Clerk publishable key for the development instance, and the API uses database, OpenAI, Clerk secret key, log-level, and allowed-origin settings aligned to `http://localhost:3000`.
- The supported local dev startup sequence is: install dependencies once, run database migrations, start the web dev server from the monorepo root, and start the FastAPI server separately from the API app directory.
- Local demo auth depends on a real Clerk-hosted sign-in flow, not a mocked or bypassed session. The Clerk development instance handles shared OAuth credentials so no provider app credentials are required locally.
- The supported local sign-in contract is Clerk development instance sign-in. Because Clerk development instances use shared OAuth credentials, any social provider can be used for local demo without registering separate OAuth app credentials.
- This PRD documents the current supported local auth behavior rather than waiting for future auth-session hardening. A local demo is acceptable when the existing browser-to-API auth contract successfully supports the signed-in solo journey end to end.
- Real database-backed persistence is required for the local demo. The walkthrough is not considered supported if profile, rating, persona, and history behavior run only through in-memory test doubles or manual data patching.
- OpenAI configuration is required for the supported local demo because recommendation requests depend on the explanation path being configured. A local run with missing model-provider configuration is not a passing signed-in solo demo.
- No beer-catalog seeding or separate catalog database import is required for the local walkthrough. The supported local recommendation demo uses the catalog already bundled with the web app.
- The canonical local demo walkthrough is:
  1. Confirm the API health endpoint responds successfully from the local API runtime.
  2. Open the local web app and start from the signed-out home or protected-route redirect path.
  3. Sign in through Clerk (any supported social provider) and return to the intended local Beerolog route.
  4. Complete the quiz and land on recommendations.
  5. Verify that profile save succeeds and that three recommendation slots load with explanation copy.
  6. Open the profile view and confirm persona loads for the signed-in user.
  7. Rate a recommended beer and then revisit or refresh the profile view.
  8. Confirm the rating appears in beer history and that the signed-in user's saved state still resolves after re-entry.
- A passing local demo proves one coherent loop: auth works, profile save works, recommendation retrieval works, explanations render, persona resolves, beer rating writes succeed, and persisted history remains available on a later read.
- The local demo should not require editing code, exporting new contracts, generating new migrations, touching deploy platforms, or consulting deferred-surface docs during the walkthrough.
- Local development may continue using development-safe defaults where the repository already allows them. This PRD does not require preview or production-hardening rules for the localhost demo path.

## Testing Decisions

- A good test for this PRD verifies externally visible demo behavior: whether a contributor can set up the supported local stack and successfully complete the signed-in solo walkthrough without hidden setup steps or unsupported shortcuts.
- Automated verification should continue to use the existing repository baseline for local confidence: type checking, linting, API tests, and contract synchronization checks. These checks are supporting evidence, not a replacement for the walkthrough itself.
- Manual verification is authoritative for this PRD because the supported local demo crosses real Clerk auth, real database persistence, browser redirect behavior, local CORS, and the live explanation dependency.
- The local manual smoke flow should verify at least: API health, sign-in redirect and callback success, quiz completion, saved recommendations with explanation text, profile/persona retrieval, beer rating submission, history persistence, and successful refresh or re-entry on the signed-in profile path.
- Existing route, service, configuration, and contract checks are prior art for this work. New test coverage is valuable only when it reduces ambiguity in the supported local demo contract rather than restating implementation details.
- Test and smoke guidance for this PRD must stay scoped to the signed-in solo MVP. Deferred venue, scan, session, challenge, leaderboard, badge, and social flows are not part of local-demo verification.

## Out of Scope

- Rewriting the roadmap or changing the accepted signed-in solo MVP boundary
- Doing the follow-on issue-slicing work inside this PRD document or publishing this PRD to an external tracker; approved execution should create local slices under `docs/issues/local-demo-flow/`
- Redesigning auth/session behavior beyond what is needed to document the current supported local demo path
- Production or preview deploy setup on Vercel, Railway, or other live environments
- Reopening deferred venue, scan, session, challenge, leaderboard, badge, or social product surfaces
- Introducing a new seeded beer-catalog pipeline or broader local content-management workflow
- Requiring admin tooling, analytics, or support tooling beyond what is needed to run the supported localhost walkthrough

## Further Notes

This PRD is a local operator artifact for the current Beerolog MVP. It sits between the high-level launch boundary and the lower-level service READMEs by turning them into one concrete, repeatable localhost demo contract.

If the supported local auth contract, persistence contract, or recommendation dependency model changes later, this PRD should be updated alongside the related service documentation so the canonical demo path stays durable and does not drift back into chat-only knowledge.
