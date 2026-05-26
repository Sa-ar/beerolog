# PRD: Group Sessions

## Problem Statement

Beerolog's launch boundary is intentionally narrow: the supported MVP is the signed-in solo flow. That launch-first focus is correct, but it leaves one important follow-on product problem unresolved. Beer choice is often a group decision, and the current Beerolog experience only helps one person at a time. When a table of friends is trying to pick drinks together, the group still falls back to guesswork, debate, or the loudest person's preference rather than a clear shared recommendation.

The repository already contains deferred group-session concepts and thin service stubs, but they are not yet a product definition. Without a dedicated post-launch PRD, follow-on work could drift in two bad directions. It could under-scope group sessions into a technical aggregation endpoint with no clear user flow, or over-scope the work into venue QR, live social, challenge, or leaderboard systems that were explicitly kept out of launch. Beerolog needs one separate post-launch requirements document that reopens the `group sessions` surface on purpose, defines the first supported group product, and keeps the launch boundary unchanged.

## Solution

Define `group sessions` as a separate post-launch roadmap surface built on top of Beerolog's existing taste model and recommendation engine. A signed-in host creates a temporary session, shares a link, and invites other people to contribute their taste for the current outing. Invitees can join quickly on their own device, either as guests with a display name or as signed-in users who want to reuse their existing taste profile. The host can request a group recommendation as soon as there is enough signal, without waiting for every invitee to finish.

The first supported version of this surface is asynchronous, host-led, and recommendation-focused. It should produce a group taste summary, a shortlist of recommended beers, and clear conflict signals when the group is split. It is explicitly post-launch follow-on work, not a launch requirement. Reopening `group sessions` does not automatically reopen venue QR flows, menu scan, friend challenges, leaderboards, badges, or broader social features. Those remain separate deferred surfaces unless a later PRD reopens them independently.

## User Stories

1. As a signed-in Beerolog user, I want to create a group session for my table, so that I can gather everyone's taste input in one place.
2. As a host, I want a shareable session link that works in any messaging app, so that inviting people is fast and low-friction.
3. As an invitee, I want to join a group session with only a display name if I do not have an account, so that participation does not depend on sign-up.
4. As a returning signed-in user, I want to contribute my existing taste profile to a group session, so that I do not have to repeat the full quiz every time.
5. As a signed-in participant, I want the option to answer a quick session-specific check-in instead of blindly reusing my saved profile, so that tonight's mood can differ from my long-term taste.
6. As a guest participant, I want a lightweight quiz path that is short and understandable, so that I can join the session without beer expertise.
7. As a host, I want to see who has joined and who has completed their input, so that I know when there is enough signal to request a result.
8. As a host, I want to request the group result before everyone has finished, so that one late person does not block the whole table.
9. As a host, I want a graceful empty or low-signal state when nobody has submitted yet, so that the app does not fail or pretend certainty.
10. As a participant, I want the group recommendation to show the best shared pick and credible backup options, so that the result feels useful even when preferences are not perfectly aligned.
11. As a participant, I want the app to call out where the group is split, so that I understand when one beer may not satisfy everyone equally.
12. As a host, I want the initial group result to remain stable once it is requested, so that late joins or later submissions do not silently change an already shared answer.
13. As a host, I want the option to refresh the result intentionally after more people submit, so that I stay in control of when the recommendation changes.
14. As a guest participant, I want my contribution to disappear when the session expires, so that a casual join does not create a durable Beerolog profile by accident.
15. As a signed-in participant, I want a group-session contribution to stay separate from my saved long-term profile unless I explicitly save it, so that transient group context does not silently retrain my taste profile.
16. As a host, I want sessions to expire automatically after the outing is over, so that stale links and old state do not accumulate.
17. As a host, I want the group experience to work without venue or QR setup, so that this product can ship independently of other deferred surfaces.
18. As a product owner, I want this PRD to reopen only the `group sessions` surface, so that launch scope and unrelated deferred features remain protected.
19. As an API developer, I want one durable group-session contract for creation, joining, submission, status, and recommendation, so that the frontend does not depend on ad hoc flows.
20. As a frontend developer, I want one clear host journey and one clear participant journey, so that the UI can be built as a coherent post-launch experience rather than a loose collection of screens.
21. As a reviewer, I want the group result to be based only on completed participants at the moment the host asks for it, so that recommendation behavior is predictable and testable.
22. As a planner, I want the first group rollout to reuse the existing `FlavorVector` and recommendation primitives, so that the post-launch surface extends Beerolog's core model instead of inventing a parallel one.

## Implementation Decisions

- This PRD is explicitly post-launch follow-on work. It does not change the authoritative launch boundary, which remains the signed-in solo flow.
- Reopening `group sessions` does not reopen venue QR entry, menu scan, tap-list management, friend challenges, leaderboards, social proof, badges, or broader operator tooling.
- The first supported group model is asynchronous and host-led. It is not a real-time multiplayer game, simultaneous live reveal, or synchronized quiz experience.
- Session creation requires a signed-in host so each session has a clear owner and can build on Beerolog's supported solo identity surface.
- Invited participants may join either as guests with a display name or as signed-in users. Guest participation is session-scoped and should not require account creation.
- Signed-in participants may contribute either their current saved taste profile or a short session-specific check-in. The feature should not require every signed-in participant to retake the full solo quiz.
- Group-session contributions are ephemeral session inputs, not automatic long-term profile updates. Persistent taste-profile changes remain part of the solo feedback loop unless a later product decision explicitly adds save-back behavior.
- The canonical taste representation for group sessions remains the existing 7-dimension `FlavorVector`. Group logic should aggregate participant vectors rather than introduce a separate group-only taste schema.
- The initial group recommendation should operate against a caller-provided candidate beer set and also support a catalog-wide fallback, so the surface can ship independently of venue-specific integrations.
- A session should track at minimum: host identity, participants, participant completion state, submitted vectors, result snapshot state, and expiration.
- The host-facing status view should expose participant names and completion progress, but the first version should avoid exposing raw individual vectors by default. Group understanding should come from aggregated conflict indicators rather than a fully transparent per-person taste dashboard.
- Recommendation generation should use only completed participants at the moment the host requests a result. Partial participation is valid. Zero completed participants should return a graceful empty state rather than an error.
- The first requested group result should be treated as a snapshot. Later joins or submissions must not silently mutate that already-produced result. If the host wants a newer answer, the host should explicitly request a refresh.
- The result contract should include both a recommendation outcome and conflict signaling. At minimum, Beerolog should surface whether preference variance is high and provide backup guidance when consensus is weak.
- Session expiration should remain short-lived and outing-oriented. The current 4-hour session lifetime is an acceptable initial product default unless later validation shows a stronger reason to change it.
- The existing deferred session logic should evolve from in-memory prototype behavior into durable application persistence, while preserving the same externally understandable lifecycle: create, join, contribute, view status, request result, expire.
- Group result presentation should be recommendation-first. A shareable summary artifact is in scope for the surface only if it reinforces the recommendation outcome; the first version should not expand into a broader social feed or viral loop system.
- The first group surface should reuse Beerolog's existing recommendation explanation style and result-slot structure where possible, so the group journey feels like an extension of the core product rather than a separate app.

## Testing Decisions

- A good test for this PRD validates externally observable session behavior: who can create and join, when a result can be requested, what happens with zero or partial completion, how expiry works, and when a result changes. Tests should not overfit to incidental storage details or internal aggregation math beyond the user-visible contract.
- Automated service tests should cover session lifecycle behavior: creation, joining, submission, completion counting, expiry rejection, zero-submission empty state, partial-submission recommendation, and explicit refresh behavior after additional submissions arrive.
- Automated contract tests should cover guest and signed-in participant entry paths separately so the surface does not accidentally collapse into account-only participation or silently persist guest data.
- Automated recommendation tests should confirm that group aggregation uses the existing `FlavorVector` model, returns a stable snapshot for a given submission set, and surfaces conflict signals when participant variance is high.
- Automated route or integration tests should verify that group endpoints remain intentionally unavailable until this post-launch surface is implemented, and later verify that the mounted API matches the documented create, join, submit, status, and recommend lifecycle.
- Manual product verification should include at least one real multi-device run: host creates a session, guests join from a shared link, one participant finishes late, the host requests a result early, and the outcome remains stable until the host intentionally refreshes it.
- Prior art for these tests already exists in the codebase's behavior-first service coverage for deferred group aggregation and expiry, plus the current coverage that confirms the public group routes are still outside the supported API surface. Future tests for this PRD should preserve that same contract-first style.
- Recommendation and profile tests elsewhere in the repo are also prior art for keeping core taste logic pure and reusable. Group-session tests should continue that pattern by validating outcomes at the module boundary rather than asserting on internal helper structure.

## Out of Scope

- Reclassifying `group sessions` as part of launch scope
- Rewriting the roadmap plan artifact or changing the launch plan document
- Reopening venue QR entry, menu scan, venue tap lists, or bar-operator workflows as requirements of this PRD
- Reopening friend challenges, social proof, leaderboards, badges, or a social activity feed
- Real-time simultaneous quiz play, timers, live reaction mechanics, or party-game presentation
- In-session chat, voting, ordering, split-bill, or POS integration workflows
- Automatic long-term profile mutation from guest submissions or session-specific signed-in check-ins
- Publishing this PRD to GitHub issues or synchronizing it to an external tracker

## Further Notes

This PRD intentionally turns a previously deferred concept into a dedicated post-launch product surface instead of leaving it implied inside the broader roadmap. The existing launch-first boundary still stands: Beerolog launches as a signed-in solo product, and `group sessions` becomes eligible for design and execution only through this separate follow-on requirements document.

If Beerolog later wants group sessions to inherit venue context, bar tap lists, challenge mechanics, or broader social proof, those should be treated as explicit follow-on expansions to this surface rather than assumptions baked into the first rollout. The goal of this PRD is to define the smallest coherent post-launch group product that is still clearly Beerolog: shared taste input, transparent consensus handling, and a recommendation the table can act on.
