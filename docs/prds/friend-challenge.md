# PRD: Friend Challenge

## Problem Statement

Beerolog's launch boundary is intentionally the signed-in solo flow, but the longer-term product story still includes friend challenge and taste comparison as follow-on social surfaces. The repository already contains deferred challenge utilities and an older roadmap concept for a "You vs Friend" flow, yet there is no local PRD that explains how this work should reopen the boundary after launch without pulling in the rest of the social roadmap at the same time.

That gap creates three planning risks. First, contributors can mistake deferred code or older roadmap notes for an approved runtime contract. Second, friend challenge can get implemented as a narrow invite mechanic without a reusable taste-comparison surface behind it. Third, broader social work such as friend graphs, venue social proof, leaderboards, and badges can get coupled to the first comparison feature even though they solve different post-launch problems and should be planned separately.

## Solution

Define `friend-challenge` as a post-launch, one-to-one invitation flow that lets a signed-in user invite a friend into Beerolog's taste quiz through a shareable link. Define `taste-comparison` as a separate post-launch surface that turns two Beerolog taste profiles into a readable side-by-side result with shared preferences, notable differences, and persona framing.

This PRD keeps those two ideas intentionally related but distinct. Friend challenge owns invitation lifecycle, acceptance, expiry, and completion signals. Taste comparison owns the comparison model, result payload, result presentation, and shareable comparison card. The first planned entry point into taste comparison is a completed friend challenge, but the comparison surface should be designed as a reusable follow-on capability rather than a one-off side effect of token redemption.

This is explicitly follow-on roadmap work. It does not change launch scope, and it does not reopen broader social features beyond the minimum needed to let two people compare Beerolog taste profiles after launch.

## User Stories

1. As a roadmap owner, I want friend challenge documented as post-launch follow-on work, so that launch planning stays focused on the signed-in solo flow.
2. As a signed-in Beerolog user, I want to generate a challenge link from my profile, so that I can invite a friend to compare tastes with me.
3. As a signed-in Beerolog user, I want to share the challenge through any messaging channel, so that Beerolog does not depend on an in-app friend graph before comparison can work.
4. As an invited friend, I want to understand who challenged me and what I will get before I start, so that the link feels trustworthy and worth completing.
5. As an invited friend, I want to take the Beerolog taste quiz through the shared link without creating an account first, so that accepting a challenge stays lightweight.
6. As an invited friend, I want the challenge flow to stay asynchronous, so that I can complete it later without coordinating live with the challenger.
7. As a challenger, I want Beerolog to tell me when my friend has completed the challenge, so that I know the comparison is ready.
8. As either participant, I want the comparison result to show how similar our tastes are overall, so that the feature feels like a real side-by-side comparison rather than two disconnected quiz outcomes.
9. As either participant, I want the comparison result to call out the dimensions where our tastes overlap, so that we can quickly see where we align.
10. As either participant, I want the comparison result to highlight our biggest taste differences, so that the result creates conversation and explains why we prefer different beers.
11. As either participant, I want to see both persona summaries in the comparison, so that the result feels recognizable within Beerolog's taste language.
12. As a challenger, I want the completed comparison to be shareable as a single card, so that the feature has a clear post-completion payoff.
13. As a frontend developer, I want invite lifecycle and comparison rendering treated as separate work areas, so that the product can deepen either surface later without rewriting both.
14. As an API developer, I want the comparison contract grounded in Beerolog's existing `FlavorVector` and persona model, so that post-launch comparison does not fork the core taste model.
15. As a reviewer, I want this PRD to keep friend challenge distinct from leaderboards, badges, social proof, and venue features, so that the first social comparison feature does not silently expand into a broader social platform.

## Implementation Decisions

- ADR 0001 and the launch scope freeze PRD remain the governing boundary. `friend-challenge` is explicit post-launch follow-on work and is not part of Beerolog's supported launch surface.
- `friend-challenge` and `taste-comparison` are separate roadmap workstreams. `friend-challenge` covers challenge creation, link sharing, invite entry, challenge status, expiry, and challenger completion signaling. `taste-comparison` covers the reusable comparison model, comparison response shape, results UI, and shareable output.
- The first supported flow is asynchronous, one-to-one, and link-based. This PRD does not introduce live co-play, multi-friend brackets, or group comparison.
- Only a signed-in user with an existing Beerolog taste profile can create a friend challenge. The invitee may complete the linked comparison flow without creating an account.
- The authoritative challenge entry point remains a shareable link rather than an in-app friend graph. Broader friendship management can be planned later as a separate follow-on surface.
- Challenge links should expire after 7 days. Expired links should fail gracefully and direct the challenger to issue a fresh invite rather than silently degrading.
- The authoritative comparison inputs remain two `FlavorVector` values using the current seven-dimension Beerolog contract plus persona classification derived from those vectors. This feature does not change flavor-vector dimensions, schema versioning, or persona taxonomy.
- The minimum useful comparison payload is: an overall similarity signal, the dimensions the two users clearly share, the dimensions where they differ most, and each participant's persona summary. The result should read in product language rather than exposing raw scoring math.
- `taste-comparison` should be reusable beyond the first invite flow. `friend-challenge` is the first activation path into comparison, but it should not own all comparison logic or make the comparison result impossible to reuse in future post-launch surfaces.
- A completed challenge should produce a durable result for the signed-in challenger to revisit in-app. The invitee should be able to see the completed comparison immediately even if they remain anonymous for the first version.
- The first challenger notification requirement is in-product signaling that a comparison is ready. Push, SMS, or email notifications are not required for the first post-launch version.
- The shareable "You vs Friend" card belongs to the `taste-comparison` surface, not to token generation. Card generation should happen after a completed comparison exists.
- This PRD does not introduce venue-aware comparisons, friend recommendation counts, leaderboard credit, badge progression, or broader social proof. Those remain separate post-launch roadmap work.
- Existing deferred challenge code and tests are useful prior art, but repository presence does not by itself finalize the product contract for post-launch release.

## Testing Decisions

- A good test for this PRD validates externally visible behavior: a signed-in challenger can issue a link, an invitee can complete the comparison flow without an account, expired links fail clearly, and a completed comparison yields an understandable result with shared and differing taste signals.
- Service-level tests should verify challenge-link lifecycle and comparison behavior without overfitting to internal token encoding or threshold constants. The point is to confirm what the product tells users, not the exact private implementation details.
- API tests should verify that unsupported launch builds continue to keep challenge routes absent until this post-launch surface is intentionally enabled, and that the post-launch contract returns comparison data centered on similarity, shared dimensions, differing dimensions, and persona summaries.
- Web verification should focus on the major user states: challenge creation, invite landing, invitee quiz completion, expired-link handling, comparison reveal, challenger-ready state, and share-card entry points.
- Comparison tests should prefer behavior-oriented assertions such as "shared low sourness is surfaced" or "high roast difference is surfaced" rather than brittle checks against every internal score.
- Persona-related verification should reuse Beerolog's existing deterministic persona behavior. The comparison surface should present personas consistently with the rest of the product rather than inventing a separate labeling system.
- Prior art already exists in the deferred challenge token/comparison tests, the deferred-route tests that keep challenge out of launch, and the persona tests that validate stable persona classification from a flavor vector. Follow-on implementation should build on those behavior patterns.
- Manual smoke verification for the first post-launch slice should cover the full asynchronous flow: signed-in user creates a challenge, friend opens the link, completes the quiz, sees the comparison, challenger returns and sees the ready result, and both can understand the shared-versus-different framing without Beerolog-specific internal jargon.

## Out of Scope

- Reopening friend challenge or taste comparison as launch work
- Changing the roadmap plan file or creating an external GitHub issue from this PRD
- Building a persistent in-app friend graph, follow system, or social inbox
- Venue-aware challenge behavior, venue-scoped comparison, or recommendation sharing at a bar
- Leaderboards, social proof, badges, or milestone systems tied to challenge completion
- Real-time head-to-head quiz play, simultaneous answering, or live reveal moments
- Multi-party comparison, challenge tournaments, or more than two participants in a comparison
- Push notifications, email reminders, or SMS delivery requirements
- Changing the `FlavorVector` schema, persona taxonomy, or recommendation engine as part of comparison work

## Further Notes

This PRD intentionally reopens only one narrow deferred social area after launch: invite-based friend challenge plus a reusable taste-comparison result. It should be read alongside Beerolog's launch boundary documents so execution slices do not treat this follow-on work as retroactive launch scope.

If Beerolog later wants broader social relationships, venue-native comparison moments, or reputation systems that build on challenge activity, those should start from separate PRDs that consume the comparison surface rather than folding all social goals into the first friend-challenge release.
