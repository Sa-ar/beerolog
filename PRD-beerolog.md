# Beerolog — Product Requirements Document

## Problem Statement

When people arrive at a bar with a long tap list, they face a classic choice-overload problem: too many options, too little context, and not enough confidence to decide. Most people either freeze, pick randomly, or default to the same safe beer they always order — missing out on something they'd actually enjoy.

This pain is sharpest in beer-focused venues and any environment with a large, rotating menu. It also plays out at the social level: within every group, someone ends up fielding "what should I get?" — but without a reliable tool to answer that question well, even the most adventurous drinker is just guessing. The result is decision fatigue, lower satisfaction, slower table service, and missed upsell opportunities for bars.

The problem has two complementary dimensions:
- **Individual**: Help someone choose a beer they'll genuinely enjoy when they're staring at 20 taps.
- **Social**: Help people become the trusted beer-recommendation person in their group — even if they're not beer-savvy — turning the app into a status-enhancing tool people return to.

## Solution

Beerolog is a mobile and web app that uses a short, plain-language taste quiz to build a personal flavor profile, then recommends specific beers from the tap list in front of the user — either by scanning the menu or connecting to a bar's live tap list.

The recommendation engine combines deterministic flavor-vector scoring with an LLM layer for natural-language explanation, so every recommendation comes with a clear "why this one for you" rationale. Taste profiles persist and improve with each visit through a lightweight post-drink rating loop.

The social layer turns the app into a reputation tool: users earn a Beer Persona badge, can challenge friends to take the quiz for a side-by-side taste comparison, track how adventurous their palate has become over time, and see their social proof grow as friends try their recommendations at the same bars.

Bars participate as distribution partners: QR codes at tables drive cold-start users into the app in-moment, and bars can manage their own tap list so recommendations stay accurate.

## User Stories

### Onboarding & Profile
1. As a first-time user, I want to take a short taste quiz so that I can get a beer recommendation without knowing anything about beer styles.
2. As a first-time user, I want the quiz questions written in plain, everyday language so that I never feel lost or need prior beer knowledge.
3. As a returning user, I want my taste profile to be remembered so that I don't have to repeat the full quiz every visit.
4. As a returning user, I want a shorter, refined quiz that adapts based on my prior answers so that I can get to a recommendation faster.
5. As a user, I want to create an account so that my history, taste profile, and badges persist across devices.
6. As a user, I want to see my Beer Persona (e.g. "The Hop Head", "The Dark Side Explorer") so that I have a fun, shareable identity that captures my taste.
7. As a user, I want to share my Beer Persona card to social media or messaging apps so that my friends can see my taste profile.

### Finding Beers at the Bar
8. As a user at a bar, I want to scan the tap board with my phone camera so that the app can identify what's available without me typing anything.
9. As a user, I want the app to recognize beer names from a photo even if the board is handwritten or unusual in format so that scanning works reliably in real venues.
10. As a user, I want the app to show me a ranked list of beers from the current tap list, sorted by how well they match my taste profile, so that I can make a confident choice quickly.
11. As a user, I want to see a short natural-language explanation for why each beer is recommended for me so that I can articulate the choice to a bartender or friend.
12. As a user, I want a "Best pick", "Backup pick", and "More adventurous option" shown on the results screen so that I have a clear decision without feeling overwhelmed.
13. As a user, I want to be able to say "give me another option" if I don't like a recommendation so that I'm never stuck with a choice I don't want.
14. As a user at a bar with a digital or bar-managed tap list, I want the app to pull from the live menu automatically so that I don't need to scan anything.

### Group Mode
15. As a group host, I want to create a group session and share a link via WhatsApp or any messaging app so that everyone in my group can answer the quiz on their own phone.
16. As a group member, I want to take the taste quiz through a shared link without needing to create an account so that joining is frictionless.
17. As a group host, I want to see a single "best pick for the group" recommendation once everyone has answered so that I can order confidently on behalf of the group.
18. As a group host, I want to see a shareable card summarizing the group's consensus recommendation so that I can show it to the bartender or share it in the group chat.
19. As a group host, I want to see when each group member has completed the quiz so that I know when the group recommendation is ready.
20. As a user in a group, I want to see which beer works for everyone and which members have conflicting preferences so that I understand the recommendation.
21. As a group host, I want the session to work even if some members never complete the quiz so that I'm not stuck waiting.

### Ratings & Profile Refinement
22. As a user, I want to rate a beer I just drank with a 3-tap response (Loved it / It was fine / Not for me) so that the app learns my real preferences over time.
23. As a user, I want my taste profile to automatically update after I rate a beer so that future recommendations keep improving.
24. As a user, I want to see a history of every beer I've tried through the app, with my rating, so that I can remember what I've had.
25. As a user, I want to see my "Taste Evolution" — how my preferences have shifted since I started using the app — so that I can understand how my palate is developing.
26. As a user who has become more adventurous over time, I want to receive a shareable "Taste Evolution" card so that I can celebrate and share that milestone.

### Social & Viral Features
27. As a user, I want to challenge a friend to take the taste quiz via a shareable link so that we can see a side-by-side comparison of our flavor profiles.
28. As a user, I want to see a "You vs Friend" taste comparison card after a friend accepts my challenge so that we can talk about what's similar and different about our taste.
29. As a user at a bar, I want to see which beers my friends have tried and recommended at that bar so that I can benefit from social proof.
30. As a user, I want to see how many beers I've recommended that my friends also ended up liking so that I can track my growing reputation as the group's beer expert.
31. As a user, I want to see a leaderboard of top recommenders at a specific bar so that being a trusted local expert feels rewarding.
32. As a user, I want to earn a "First-Timer" badge when I'm among the first to try a new tap at a bar I frequent so that discovery feels special.
33. As a user, I want to see a bar explorer progress ring showing how many of a bar's beers I've tried so that repeat visits feel like a game.
34. As a user, I want to receive a prompt like "You're becoming the go-to beer person for your group" after my recommendations hit a milestone so that the status signal is made explicit.

### Bar Partner Experience
35. As a bar owner or manager, I want to create a venue profile and manage my tap list so that users scanning my bar's QR code get accurate, live recommendations.
36. As a bar, I want to generate a QR code for my venue that users can scan at the table to enter the app in-context so that I can drive in-moment usage.
37. As a bar, I want to add, remove, and update beers on my tap list easily so that recommendations don't go stale when I change kegs.
38. As a bar, I want to see aggregate data about which of my beers are most recommended and most loved by users so that I understand what's working.
39. As a bar, I want to add flavor attribute metadata to beers on my tap list so that the recommendation engine has accurate data to work with.

### Edge Cases & Polish
40. As a user with no beer history, I want the full adaptive quiz to run on every visit until I have enough ratings to shorten it so that early recommendations are still good.
41. As a user who dislikes a style, I want to be able to flag a beer as "not my style" so that similar recommendations are suppressed in the future.
42. As a user in a noisy bar, I want the UI to be large-text and high-contrast so that I can read it easily in dim light.
43. As a user who wants to explore independently, I want to browse the beer catalog filtered by style or flavor so that I can learn outside of the recommendation flow.

## Implementation Decisions

### Modules

**TasteQuiz**
- Stateless service that runs a 6–8 question adaptive quiz.
- Questions are plain-language, forced-choice, or pick-up-to-3 format — no beer jargon.
- Outputs a normalized flavor vector: `{ bitterness, sweetness, fruitiness, roast, sourness, body, adventure }` each on a 0–1 scale.
- For returning users with sufficient rating history, the quiz is shortened (3–4 questions), pre-filling dimensions already known with high confidence.
- Branching logic: answers to early questions skip irrelevant later questions (e.g., a "no bitterness" answer collapses the IPA-related branch).

**RecommendationEngine**
- Input: one or more flavor vectors + a list of beers with flavor attributes.
- Step 1: Deterministic scorer computes a match score for each beer using weighted cosine similarity against the taste vector.
- Step 2: LLM receives the top 5 scored beers and the user's vector, returns ranked top 3 with a one-sentence natural-language explanation per beer.
- Group mode: vectors are merged via weighted average; conflict detection flags dimensions with high variance and surfaces them in the group result UI.
- Adventure level modulates the scoring: higher adventure boosts outlier beers; lower adventure penalizes unfamiliar styles.

**BeerCatalog**
- Curated internal database of beer entries.
- Each beer: name, brewery, style, ABV, flavor attributes (bitterness, sweetness, fruitiness, roast, sourness, body), style tags, description.
- Flavor attributes are stored as normalized 0–1 values, consistent with the TasteQuiz vector schema.
- Admin interface for catalog management (add, edit, merge duplicates).

**MenuScanner**
- User photographs the tap board; image is sent to a vision-capable LLM.
- LLM extracts a list of beer names and brewery names from the image.
- Each extracted name is fuzzy-matched against the BeerCatalog; unmatched entries are queued for admin review and shown to the user as "we're not sure about this one."
- Confidence score per match; low-confidence matches are surfaced as optional confirmations.

**VenueService**
- Bar profiles: name, location, contact, tap list, QR code.
- Tap list: list of BeerCatalog entries with optional override attributes (e.g., bar's own description).
- Bars can update tap list via a simple web dashboard.
- QR codes encode a venue ID + optional table ID; scanning opens the app (or web) pre-loaded with that venue's tap list.
- Fallback: if no bar profile exists, users can use MenuScanner or manually select from catalog.

**UserProfile**
- Account: email/OAuth, display name, avatar.
- Taste vector: persistent, updated after each rating via exponential moving average.
- Beer history: ordered list of beers tried with rating, date, venue.
- Persona: derived from dominant flavor dimensions; name + icon; recalculated after each profile update.
- Badge collection: bar explorer rings, first-timer flags, expert level, taste evolution milestones.
- Friend graph: linked accounts for social proof and challenge features.

**GroupSession**
- Host creates a session; receives a shareable link/QR.
- Session state: list of participant taste vectors + completion status.
- Recommendation triggered when host requests it (not blocked on all completing).
- Aggregation: weighted average of all submitted vectors; variance computed per dimension.
- Output: group recommendation (top 3) + shareable group result card.
- Sessions expire after 4 hours.

**FeedbackService**
- 3-tap post-drink rating: Loved it (+1), It was fine (0), Not for me (-1).
- Rating triggers an update to the user's taste vector: nudge each dimension toward the rated beer's attributes, scaled by rating strength.
- "Not for me" also adds a style penalty that suppresses similar beers for N future sessions.
- Rating is also stored to power "Saar recommended" social proof queries.

**SocialLayer**
- Shareable cards: persona card, taste evolution card, group result card, You vs Friend comparison card. Generated as images (OG-card compatible).
- Friend challenge: generates a unique quiz link tied to the challenger's profile; when friend completes, both receive a comparison card.
- "Recommended by" social proof: when a user views a beer at a venue, a count of friend recommendations is shown if any friends have rated it positively there.
- Bar leaderboard: query over ratings at a venue, ranked by positive recommendation count per user.

**BadgeEngine**
- Bar explorer: tracks unique beers tried per venue; emits progress update on each new rating; milestone badges at 25%, 50%, 100%.
- First-timer: compares rating timestamp against the beer's first appearance at that venue; badge if user is in the first 5 raters.
- Expert level: increments when a friend tries and positively rates a beer the user recommended; milestone prompts at 5, 10, 25.
- Taste evolution: snapshot of taste vector at onboarding; compare to current; emit shareable card when cumulative drift exceeds threshold.

### Technical Decisions
- Both native mobile (iOS/Android) and mobile-responsive web at launch.
- Full user accounts required; OAuth (Google/Apple) as primary auth to minimize signup friction.
- Flavor vectors are the canonical data model shared across Quiz, Recommendation, Beer Catalog, and Feedback — all modules speak the same schema.
- LLM calls are bounded: one call per recommendation request (not per question); menu scan is one call per image.
- Group session state held server-side; participants join via stateless link.
- Shareable cards rendered server-side as images for reliable social media previews.

## Testing Decisions

**What makes a good test here:** tests should verify externally observable behavior — given these quiz answers, what flavor vector comes out; given this vector and this beer list, what ranking comes out. Tests should not assert on internal scoring weights or LLM prompt wording, which will evolve.

**TasteQuiz**
- Test: given a specific sequence of answers, the output vector values are in the expected ranges.
- Test: branching logic skips the correct questions given prior answers.
- Test: returning user with high-confidence vector on a dimension receives a shortened quiz (that dimension not asked).
- Test: quiz with all "not sure" answers produces a centered vector (all ~0.5).

**RecommendationEngine**
- Test: given a strong "no bitterness, fruity, light" vector, lager-family beers rank above IPA-family beers.
- Test: given a "roasty, rich, adventurous" vector, stout/porter family ranks highest.
- Test: group vector aggregation — two conflicting vectors produce expected midpoint values.
- Test: high-variance group dimensions are flagged correctly in the output.
- Test: adventure=0 penalizes outlier beers (those far from centroid of common styles).

**GroupSession**
- Test: session with 0 participants returns a graceful empty state, not an error.
- Test: partial completion (2/5 members answered) still produces a valid recommendation.
- Test: adding a late participant after recommendation was already requested does not mutate the prior result.
- Test: session expires after 4 hours and rejects new joins.

**FeedbackService**
- Test: "Loved it" rating nudges the user's vector toward the rated beer's attributes.
- Test: "Not for me" rating applies a style suppression and the suppressed style scores lower in the next recommendation.
- Test: repeated "Loved it" ratings on the same style converge the vector toward that style over time.
- Test: rating does not mutate vector for an anonymous (non-account) user.

## Out of Scope

- Real-time group quiz mode (both users answering simultaneously with live reveal). Async link-based group mode ships first.
- In-app social feed or activity timeline. Social features are card-based and export-driven, not a feed.
- Food pairing recommendations.
- Wine, spirits, or non-beer beverages.
- Brewery-side portal (separate from bar/venue portal).
- Direct table ordering or POS integration.
- Paid/premium tier differentiation (all features available to users at launch).
- Detailed tasting notes or review text beyond the 3-tap rating.

## Further Notes

- The Beer Persona name and icon system ("The Hop Head", "The Dark Side Explorer", etc.) needs a defined taxonomy — suggest 8–12 personas covering the main flavor profile clusters, with fun names that are shareable and non-intimidating.
- The flavor vector schema is the single most important architectural decision: changes to it are breaking changes for every stored user profile. Define it carefully before building and treat it as a versioned contract.
- Bar onboarding friction is the biggest GTM risk. QR codes are the distribution mechanism, but someone has to get bars to place them. Consider a self-serve flow where any user can "claim" a bar and seed the tap list, with bar ownership transferable when the official owner signs up.
- The LLM explanation layer is where the product voice lives. The tone should be confident and social ("This is a strong pick for you and the group") not hedging ("You might enjoy this").
- Consider a "guest mode" for group session participants: they complete the quiz and see the group result without creating an account, but are shown a conversion prompt after.
