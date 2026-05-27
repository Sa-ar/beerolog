# PRD: Persistence Foundation

## Problem Statement

Beerolog's supported MVP is a signed-in solo product, so its core value depends on persistence feeling real rather than temporary. A user can already sign in, finish the quiz, receive recommendations, rate beers, and return to a profile screen, but launch readiness still depends on one durable definition of what data must be persisted, where that persistence is authoritative, and what guarantees the launch system must provide when profile state changes over time.

Without a focused persistence PRD, launch work can drift in three damaging directions. First, the team can confuse in-memory test wiring or partially implemented database access with a launch-ready persistence contract. Second, profile, history, and feedback writes can be treated as separate implementation details instead of one coherent user-state system, which raises the risk of partial or inconsistent saved state. Third, persistence planning can sprawl back into deferred venue, group, or social data models simply because related ideas or old schema concepts still exist elsewhere in the repository.

## Solution

Define one launch persistence foundation for the supported signed-in solo MVP only. This PRD establishes PostgreSQL-backed persistence as the production source of truth for the authenticated user's runtime state, limits launch persistence scope to the supported solo tables and flows, and specifies what must happen when the user saves a profile, rates a beer, revisits their profile, or returns later for more recommendations.

The persistence foundation should make launch behavior explicit without expanding product scope. It should lock in the canonical user identifier, the supported persisted records, the transactional expectations for rating-driven profile evolution, the migration and configuration requirements for production, and the verification needed to trust persistence at launch. It should not reopen venue, group, challenge, leaderboard, badge, or social data work.

## User Stories

1. As a signed-in user, I want the taste profile created from my quiz to persist after the results handoff, so that Beerolog remembers me when I come back.
2. As a returning user, I want my current profile and persona to come from saved server state, so that the app feels consistent across sessions instead of browser-local only.
3. As a signed-in user, I want each beer rating to be recorded in my history, so that I can see what I have tried over time.
4. As a signed-in user, I want rating a beer to update my saved taste profile when appropriate, so that Beerolog learns from my feedback.
5. As a signed-in user, I want disliked styles to stay suppressed across later recommendation cycles, so that Beerolog does not immediately repeat beers I rejected.
6. As a signed-in user, I want my persisted state tied to my authenticated account, so that another user's data never appears as mine.
7. As an API developer, I want one authoritative persistence boundary for the supported solo user state, so that the launch data model does not fragment across unrelated repositories or ad hoc writes.
8. As a maintainer, I want production runtime to use a real database rather than silent in-memory fallbacks, so that launch confidence is based on real persistence behavior.
9. As an operator, I want database migrations and runtime configuration treated as part of launch persistence, so that the supported user flows do not fail after deployment due to missing setup.
10. As a reviewer, I want persistence scope limited to the signed-in solo MVP tables and flows, so that deferred venue, group, and social models do not re-enter launch work by accident.
11. As a contributor, I want flavor-vector schema versioning respected in persisted profile state, so that future changes to the vector contract cannot silently corrupt stored data.
12. As a tester, I want behavior-oriented persistence checks around profile save, history retrieval, persona derivation, and rating side effects, so that regression coverage matches real user behavior.
13. As a support person, I want persistence failures to surface clearly as launch-blocking runtime issues, so that broken database wiring is not mistaken for minor polish work.
14. As a roadmap owner, I want this PRD to describe only the launch persistence foundation, so that future product expansion still requires separate planning artifacts.

## Implementation Decisions

- ADR 0001 and the launch scope freeze PRD remain the governing boundary for this work. `persistence-foundation` applies only to the supported signed-in solo MVP.
- Launch persistence scope is limited to four supported runtime tables: `users`, `user_profiles`, `beer_ratings`, and `user_style_suppressions`.
- PostgreSQL is the launch system of record for supported user persistence. In-memory repositories remain test infrastructure only and are never an acceptable production fallback.
- The authenticated Clerk user id is the canonical persisted user identifier for launch (see ADR 0002). All supported persisted solo state is keyed from that identifier. This replaces the previous Cognito `sub` assumption.
- The `users` record is a lightweight identity anchor for the supported runtime, not a broader editable account-profile system. Launch persistence may snapshot available auth claims such as email and display name when they are present, but this feature does not introduce user-managed profile editing.
- `user_profiles` stores the user's current `FlavorVector`, its schema version, and last update time as the authoritative saved taste profile for the signed-in solo journey.
- `beer_ratings` is the authoritative history of supported solo feedback events. Each persisted entry records the user, the rated beer, the rating value when present, and the time of the event.
- `user_style_suppressions` is launch-critical private runtime state for disliked-style TTL behavior. It is persisted for recommendation quality, not exposed as a separate launch feature surface.
- The supported persistence write flows are limited to: saving the current profile after quiz completion, retrieving the saved profile, retrieving beer history, recording rating events, and persisting rating-driven profile evolution plus suppression updates.
- Rating persistence must be treated as one coherent state transition from the user's perspective. When a rating changes saved state, the resulting profile update, history write, and any suppression update must succeed or fail together rather than leaving partial persisted state behind.
- Persona remains a derived read from the current saved profile vector. Launch does not introduce a separate persisted persona table.
- The existing solo persistence repository boundary should remain narrow and focused on supported user state. Launch does not require generalizing that boundary to deferred venue, session, challenge, leaderboard, or social repositories.
- The web app may continue to hold short-lived local UI state, but authoritative launch user state must come from server-backed persistence. Refreshing or returning later should reflect saved profile, history, and derived persona from the database-backed API.
- Launch runtime must fail closed for missing or unavailable supported persistence. Production behavior must not silently swap to ephemeral in-memory state when the database is misconfigured or unreachable.
- Launch readiness requires the production database to have the supported schema migrated before release. Schema drift between declared tables and the live database is a launch blocker.
- The `FlavorVector` contract remains unchanged for this PRD. Any future dimension change still requires a schema-version bump and an explicit migration strategy for stored profiles rather than an implicit overwrite.
- This PRD does not introduce persistence for the beer catalog, venue state, tap lists, scans, group sessions, challenges, leaderboards, badges, friendships, or social proof.

## Testing Decisions

- A good test for this PRD verifies external persistence behavior: saved state survives across requests and sessions, rating side effects remain consistent, and the supported user journey behaves the same after refresh or return.
- Existing behavior-first route and service tests are the main prior art. Persistence verification should continue to emphasize request/response outcomes and observable saved-state behavior rather than private implementation details.
- Automated API coverage should verify that profile save and later profile retrieval round-trip the persisted vector, that history retrieval returns stored feedback events in the expected order, and that persona is derived from the saved profile rather than transient UI state.
- Automated verification should also cover rating behavior as a persistence flow: a rating request records history, updates the saved profile when required by the rating rules, and persists disliked-style suppressions when the user rejects a beer.
- Because launch persistence depends on a real production store, focused verification should exist for the supported PostgreSQL-backed repository behavior in addition to in-memory service tests. The important contract is that the production repository honors the same observable semantics as the in-memory test double.
- Contract checks remain part of persistence verification because the signed-in web flow depends on the documented user endpoints matching the shipped API surface.
- Manual smoke validation for launch should include a real signed-in round trip: complete the quiz, confirm profile save, reload or re-enter the app, retrieve profile/persona/history, rate a beer, and verify the resulting state remains available on a later read.
- Verification should stay tightly scoped to the supported solo persistence surface. This PRD does not require new test infrastructure for deferred venue, group, or social models.

## Out of Scope

- Reopening venue, tap-list, menu-scan, QR-token, group-session, challenge, leaderboard, badge, friendship, or social-proof persistence
- Introducing new launch tables outside the supported solo persistence surface
- Persisting the beer catalog in a new launch data model or replacing the current catalog source
- Adding editable account-profile management, social identity features, or broader user settings
- Expanding persistence into admin tooling, analytics warehouses, recommendation experimentation, or product-growth tracking
- Changing the `FlavorVector` dimensions or redesigning the recommendation and persona models
- Rewriting the roadmap plan or doing the follow-on issue-slicing work inside this PRD document; approved execution should create local slices under `docs/issues/persistence-foundation/`

## Further Notes

This PRD is about trust in saved state, not product expansion. For the supported Beerolog MVP, persistence is the foundation that makes signing in, retaking the quiz, rating beers, and returning later feel like one continuous product instead of a disposable demo.

If Beerolog later wants persistent venue data, group history, social graphs, shared personas, or broader operational datasets, that work should begin with separate PRDs that explicitly reopen those surfaces. This launch artifact intentionally keeps the persistence contract small, durable, and centered on the solo signed-in learning loop.
