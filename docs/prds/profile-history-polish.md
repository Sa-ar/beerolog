# PRD: Profile History Polish

## Problem Statement

Beerolog's launch boundary already includes persistent profile, persona, beer ratings, and beer history for the signed-in solo flow, but the current experience still feels thinner and less trustworthy than the rest of the launch journey. A signed-in user can save a profile, fetch a persona, rate a beer, and retrieve history, yet the web experience does not fully explain how those pieces connect or consistently surface the data that already exists in the launch contracts.

That gap creates four launch risks. First, the profile screen does not yet feel like the authoritative home for a returning user who wants to understand their current taste state. Second, persona behavior can feel opaque because it only appears when a saved profile exists and otherwise falls back to silence. Third, rating feedback is narrow and optimistic, which weakens confidence that a user's action actually updated history and profile state. Fourth, the history surface underuses the persisted data already available for launch, which makes the ongoing learning loop feel less durable than it is.

## Solution

Polish the signed-in profile loop so that Beerolog clearly behaves like a product that remembers the user and evolves with each rating. The launch experience should make one story obvious: the quiz seeds the profile, the persona summarizes the current taste shape, ratings refine that shape, and the profile/history screen lets the user see the results over time.

This polish should stay inside the accepted launch boundary. It should not add new social, challenge, leaderboard, badge, or venue behavior. It should tighten the existing signed-in solo experience by clarifying persona states, improving the rating loop, and making beer history feel intentionally persisted rather than incidentally stored.

## User Stories

1. As a signed-in user, I want my profile screen to feel like the home for my Beerolog state, so that I know where to return after getting recommendations.
2. As a signed-in user, I want to see my current persona when my profile exists, so that I can quickly understand the kind of beer drinker Beerolog thinks I am.
3. As a signed-in user without a saved profile yet, I want a clear empty persona state, so that I know I need to complete the quiz before Beerolog can classify me.
4. As a returning user, I want my beer history to show the beers I have rated in reverse chronological order, so that my latest activity is easiest to review.
5. As a returning user, I want each history item to show when I tried it, so that my profile feels like a real timeline instead of a bare list.
6. As a signed-in user, I want each supported recommendation in the launch results flow to be rateable, so that I can refine my profile from the beers Beerolog actually surfaced to me.
7. As a signed-in user, I want rating feedback to confirm that my action was saved, so that I trust Beerolog did not drop my input.
8. As a signed-in user, I want rating failures to be visible and recoverable, so that I can retry instead of assuming my history or profile changed.
9. As a signed-in user, I want the profile experience to explain that ratings influence my ongoing taste profile, so that the learning loop feels understandable rather than magical.
10. As a signed-in user, I want a clear next step from my profile, so that I can either get fresh recommendations or continue refining my history.
11. As a reviewer, I want the launch profile loop to stay within the signed-in solo MVP, so that deferred social and gamified surfaces do not quietly return through polish work.
12. As an operator, I want profile, persona, rating, and history behavior to remain grounded in the current authenticated APIs and persisted storage, so that launch polish does not depend on non-authoritative client-only state.

## Implementation Decisions

- The supported user for this PRD is the signed-in solo user only. Anonymous rating, shared personas, challenge comparisons, leaderboards, badges, and other deferred surfaces are not part of this launch polish.
- The profile experience is the authoritative returning-user surface for launch. It should combine account identity, current persona state, beer history, and clear calls to continue the supported solo loop.
- Persona remains a derived summary of the persisted flavor vector. The launch polish does not introduce manual persona selection, persona editing, persona history, or alternative persona generation logic.
- The profile surface should show explicit persona states rather than silently omitting the section. At minimum, the experience should distinguish between loading, available persona, no saved profile yet, and failed persona retrieval.
- Beer history should remain sourced from persisted user history entries only. The launch experience should render entries in reverse chronological order and surface the already-persisted tried-at timestamp in a readable way alongside beer identity and rating.
- Launch history remains append-only for the user. Editing or deleting history entries is not required for launch polish.
- The launch rating taxonomy remains `loved`, `fine`, and `disliked`. These values are part of the supported contract and should not be renamed or expanded in this PRD.
- Rating behavior keeps its current meaning: `loved` nudges the saved flavor vector toward the beer, `fine` records history without nudging the profile, and `disliked` nudges the vector away from the beer while recording the existing style suppression side effect.
- User-facing copy should describe rating outcomes in product terms like saved history and updated profile, not in low-level vector or suppression language.
- Rating affordances should be available on the supported recommendation cards in the signed-in solo results flow rather than existing only as a one-off top-pick action. The rating interaction should stay focused on beers Beerolog already surfaced within the supported MVP.
- A successful rating should produce immediate confirmation and a predictable follow-up state. The user should not have to infer success from silent dismissal alone.
- A failed rating should keep the user in a recoverable state with actionable feedback and a retry path. Launch polish should not treat rating submission as fire-and-forget.
- If additional response data is needed to keep the post-rating UI in sync, any contract expansion must stay limited to profile, persona, or history data already inside the signed-in solo boundary.
- Profile and history copy should reinforce the supported launch loop: take the quiz to seed the profile, get fresh picks, rate beers, and return to see the profile evolve over time.
- Launch polish should not expose raw flavor-vector dimensions, style suppression counts, or other internal tuning details as new profile UI.
- This PRD does not treat persona sharing, persona comparison, or other social persona surfaces as launch work. Any existing affordance in that area remains outside the signed-in solo MVP unless a later follow-on PRD reopens it.

## Testing Decisions

- A good test for this PRD validates user-visible behavior across the signed-in solo loop rather than implementation details of state management or layout.
- Web verification should cover the profile screen's main persona states, history rendering with readable timestamps, clear empty states, and rating success and failure behavior from the supported recommendation flow.
- Behavior tests for ratings should assert the externally visible contract: the correct rating value is submitted, success feedback appears, failure feedback is recoverable, and persisted history/profile state can be observed on subsequent reads.
- API verification should continue to rely on behavior-oriented route tests for authenticated profile, history, persona, and rating endpoints instead of testing framework plumbing.
- Service-level prior art already exists for persona classification and rating semantics. Those tests should remain the source of truth for deterministic persona mapping and for the existing `loved`/`fine`/`disliked` effects on saved profile state and history.
- If the API contract changes to support better post-rating synchronization, contract generation and client schema synchronization should be part of verification so the shipped web client and documented API stay aligned.
- Manual smoke verification should cover the supported end-to-end path: sign in, complete the quiz, view recommendations, rate one or more surfaced beers, open the profile, confirm persona visibility, and confirm that recent history reflects the submitted ratings.
- Manual verification should also cover the pre-profile path for a signed-in user who has not completed the quiz yet, so the launch experience proves that missing persona/history states are intentional and understandable.

## Out of Scope

- Reopening challenge, leaderboard, badge, social proof, venue, scan, or group-session flows
- Changing the accepted launch-first product boundary
- Reworking the persona catalog, cosine-matching approach, or flavor-vector model
- Adding manual persona editing, persona comparison, or persona progression history
- Adding history editing, deletion, filtering, search, or export features
- Exposing style suppression as a new user-facing concept
- Expanding rating inputs beyond the existing three-value launch taxonomy
- Doing the follow-on issue-slicing work inside this PRD document, changing the roadmap artifact, or defining post-launch growth features; approved execution should create local slices under `docs/issues/profile-history-polish/`

## Further Notes

This PRD is a launch polish artifact, not a launch expansion artifact. It exists to make the already-supported profile loop feel complete and trustworthy enough for release without pulling in adjacent ideas that belong to later planning.

The most important product outcome is confidence. A signed-in user should be able to tell that Beerolog remembers their state, explains their current persona, accepts feedback on recommendations, and reflects that feedback in a durable history. If the experience still feels ambiguous about any of those steps, the launch profile loop is not polished enough yet.
