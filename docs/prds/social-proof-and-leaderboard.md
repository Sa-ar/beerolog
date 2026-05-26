# PRD: Social Proof and Leaderboard

## Problem Statement

Beerolog's launch boundary intentionally stops at the signed-in solo loop, but the longer-term product story still includes a social reputation layer that helps a user feel like the trusted beer person in their group and at their local venue. The roadmap, architecture notes, and deferred service modules already acknowledge `social proof` and `leaderboard` as follow-on ideas, yet they are still underspecified as product surfaces. Right now the repo contains only thin deferred placeholders: one social-proof query counts friends who positively rated a beer at a venue, and one leaderboard query ranks users by venue-local positive counts. Those placeholders are useful exploration artifacts, but they are not authoritative enough to guide post-launch slicing.

That gap creates three planning risks. First, social proof and leaderboard can drift together as one vague "social features" bucket even though they solve different user problems and should not necessarily ship together. Second, the current placeholder leaderboard semantics are too weak for a reputation feature because they collapse "I liked a beer" and "I gave someone a useful recommendation" into the same signal. Third, without an explicit PRD, later planning work could either pull these surfaces back into launch scope by accident or implement them with mismatched privacy, friendship, and venue rules.

## Solution

Define `social proof` and `venue leaderboard` as post-launch follow-on work that shares a small social foundation but remains two separate roadmap surfaces. Social proof should help a signed-in user decide what to order in a venue context by showing whether connected friends liked a specific beer at that same venue. Venue leaderboard should be a distinct reputation surface for regulars who want recognition for recommendations that actually proved useful to other people.

This PRD does not reopen launch scope. It creates a post-launch contract for how Beerolog can add venue-local social signals after the signed-in solo launch is complete. The document should separate the simpler "friends liked this here" signal from the stronger "this person reliably steers others toward beers they end up liking" signal, so later slices can ship social proof first and leaderboard later without redefining the domain each time.

## User Stories

1. As a signed-in user at a venue, I want to see whether my connected friends liked a beer at that same venue, so that I can decide faster with more confidence.
2. As a signed-in user at a venue, I want the social signal to stay tied to that venue, so that Beerolog does not imply a beer is socially proven everywhere just because someone liked it somewhere else.
3. As a signed-in user, I want Beerolog to name the friend when exactly one connected friend is the source of proof, so that the signal feels personal and understandable.
4. As a signed-in user, I want Beerolog to show a count when multiple connected friends are the source of proof, so that the signal scales without turning into clutter.
5. As a privacy-conscious user, I want control over whether my ratings can be used for social proof and leaderboard surfaces, so that venue-local reputation is opt-in rather than assumed.
6. As a signed-in user with no connected-friend signal for a beer, I want Beerolog to show no fabricated social proof, so that silence is more trustworthy than weak filler copy.
7. As a returning venue user, I want social proof to appear on venue-scoped beer and recommendation surfaces rather than in a separate social feed, so that it helps in the ordering moment.
8. As a socially active user, I want Beerolog to distinguish between a friend merely liking a beer and a friend successfully recommending it to others, so that reputation signals feel fair.
9. As a regular at a venue, I want a leaderboard that reflects useful recommendation outcomes, so that local recognition feels earned instead of noisy.
10. As a user who appears on a venue leaderboard, I want the ranking to stay venue-local and recent, so that the board reflects current trust at a specific place rather than lifetime app usage.
11. As a signed-in user outside the public top entries, I want to see my own venue standing when available, so that the leaderboard still feels motivating without requiring public exposure.
12. As a planner, I want social proof and leaderboard to be sliceable as separate follow-on workstreams, so that Beerolog can stage rollout and de-risk the social layer.
13. As an API developer, I want the social and leaderboard contracts to share one privacy and attribution model, so that the post-launch surface stays coherent across web and API work.
14. As a reviewer, I want this PRD to state explicitly that the work is post-launch only, so that deferred social features do not quietly re-enter the signed-in solo MVP.

## Implementation Decisions

- ADR 0001 and the launch scope freeze remain authoritative for launch. `social-proof-and-leaderboard` is explicitly post-launch follow-on work and must not be treated as a launch requirement.
- `Social proof` and `venue leaderboard` are related but separate roadmap surfaces. They should be sliced, estimated, and potentially shipped independently even though they share social graph, privacy, and venue-attribution foundations.
- Social proof is the earlier and simpler surface. It should be able to ship without the venue leaderboard.
- The user-facing social-proof message should represent a venue-scoped friend-like signal, not a global popularity signal. The core question is "did one of my connected people like this beer here?" rather than "is this beer broadly popular?"
- Social proof should appear only in venue-aware recommendation and beer-detail contexts where the user is actively deciding what to order. This PRD does not introduce a social home feed, global activity timeline, or cross-venue popularity browse.
- Social proof should be based on explicit social connections plus a positive rating recorded at the same venue for the same beer. A challenge completion or taste comparison alone does not automatically create a social connection.
- Social-proof copy should be honest about the underlying signal. If Beerolog is using a friend's positive rating at the venue, the UX should read as "friends liked this here" or equivalent, not as a stronger claim that the friend directly recommended it unless recommendation attribution exists.
- Privacy for social features is opt-in at the level of whether a user's venue ratings can contribute to friend-visible social proof and public venue leaderboard placement. Opting out removes the user's contribution from other people's social surfaces.
- Venue leaderboard is a separate reputation surface and should not be ranked by raw positive ratings alone. A leaderboard entry should reflect successful recommendation outcomes, meaning another connected user followed a recommendation and later rated that beer positively in the same venue context.
- Because leaderboard semantics are stronger than social-proof semantics, Beerolog needs a dedicated recommendation-attribution record or equivalent trust-event ledger. Rating rows alone are insufficient as the authoritative leaderboard source.
- The shared post-launch foundation should include at least four durable concepts: a social connection model, a visibility policy, a venue-scoped recommendation-attribution model, and read models for social-proof and leaderboard queries.
- Venue leaderboard should remain venue-local, not global across the app. A user can be trusted at one venue without implying the same rank everywhere else.
- Venue leaderboard should use a recency window rather than all-time accumulation so the surface stays relevant to current venue regulars. The default product contract is a rolling 90-day window unless later follow-on planning intentionally changes it.
- Public leaderboard rendering should be capped to a small visible set such as the top 10, while still allowing the signed-in viewer to see their own standing when it exists.
- A user who opts out of public social visibility should be excluded from public leaderboard entries. Beerolog may still show that user a private self-only standing if the product wants motivational feedback, but that private readout must not expose them publicly.
- Tie handling should be stable and productized. Users with equal recommendation-impact totals should share rank rather than being given arbitrary ordered positions.
- Leaderboard entries should carry only lightweight public identity needed for the venue surface, such as display name and persona summary. This PRD does not authorize full public profiles, follower counts, or broader social identity pages.
- Neither surface changes the launch recommendation flow, profile loop, or launch API contract. The deferred route and contract posture should remain in place until the corresponding post-launch work is intentionally reopened for implementation.
- The deepest modules in this area should hide noisy event logic behind small query-oriented interfaces: one module that resolves venue-scoped social proof for a viewer and beer, one module that records recommendation-attribution outcomes, one policy module that decides visibility, and one module that produces venue leaderboard reads.

## Testing Decisions

- A good test for this PRD validates external product behavior and trust semantics: who appears as proof, when a signal is absent, how privacy changes visibility, and how venue-local leaderboard rank is derived from recommendation outcomes rather than raw internal counters.
- Social-proof tests should cover venue scoping, friend scoping, privacy opt-out, zero-signal behavior, single-friend naming, and multi-friend count aggregation.
- Leaderboard tests should cover successful recommendation attribution, recency-window filtering, privacy exclusion, shared-rank ties, top-list truncation, and signed-in viewer self-standing behavior.
- Contract and route verification should continue the repo's existing pattern of keeping deferred social and venue endpoints out of the supported launch API until the follow-on work is intentionally mounted.
- Prior art already exists in the current deferred service tests for venue scoping, privacy filtering, positive-rating behavior, and shared-rank handling. Those tests are useful seeds, but future implementation should tighten them around the stronger post-launch semantics defined here.
- End-to-end verification should eventually prove the real product loop: one user sees venue-aware social proof while deciding, follows a recommendation path, rates a beer positively, and a recommender's venue leaderboard standing updates only when the attribution contract is satisfied.
- Manual smoke coverage for the post-launch work should verify that these signals appear only in venue-aware contexts and remain absent from launch-only solo surfaces.

## Out of Scope

- Reopening `social proof`, `leaderboard`, or any related venue surface for launch
- Changing the roadmap plan file or using this PRD to rewrite the existing phase plan
- Adding a global social feed, comments, reactions, DMs, or broad social networking behavior
- Creating public user profile pages, influencer mechanics, or cross-venue/global leaderboards
- Redesigning the launch recommendation algorithm, profile loop, persona system, or rating taxonomy
- Reopening badges, challenge expansion, group sessions, QR flows, tap-list management, or operator analytics beyond what this PRD needs as post-launch dependencies
- Defining the exact UI copy, visual treatment, or gamification art direction for every leaderboard and proof state
- Creating GitHub issues or syncing this PRD to an external tracker

## Further Notes

This PRD intentionally narrows the social roadmap back down after the broader original product vision. The launch docs now treat social proof and leaderboard as deferred, and this document keeps that boundary intact while still making the follow-on work concrete enough to slice later.

The most important locked-in distinction is semantic: venue social proof can rely on friend-visible positive ratings, but venue leaderboard should represent trusted recommendation outcomes, not just enthusiasm. If later implementation collapses those two signals back together, Beerolog risks shipping a leaderboard that looks social but does not actually measure recommendation credibility.
