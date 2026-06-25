# PRD: Guest Preview / Try

## Problem Statement

Beerolog currently requires Clerk authentication before a user can take the taste quiz or receive any beer recommendations. This means every visitor must commit to account creation before experiencing any product value. The result is a high-friction top-of-funnel: curious visitors who are not yet ready to sign up have no way to see what Beerolog actually does, and there is no social-shareable "try it" entry point that can drive organic acquisition. The app cannot demonstrate its core value proposition — personalized beer recommendations from a fun, short quiz — without first demanding an email or OAuth handshake.

This creates two measurable problems. First, visitors who land on the home page or a shared link have no self-service path to experience the product, so conversion from visit to sign-up depends entirely on copy and trust rather than demonstrated value. Second, users who do sign up and later churn cannot be reminded of value by pointing them at a low-commitment re-engagement surface.

## Solution

Introduce a **public guest preview flow** at `/try` that gives unauthenticated visitors the full 11-question adaptive taste quiz and returns a limited set of beer recommendations — enough to demonstrate value, gated enough to motivate sign-up. Guests receive 3 fully visible beer results with the remainder blurred behind a sign-up prompt. Matching for guests uses a lightweight dial-vector cosine similarity (no OpenAI embedding call), keeping the guest path zero-cost on the AI budget. After sign-up, the guest's stored quiz answers are seamlessly hydrated into a full onboarding profile (embedding, persona, icons) so the user never retakes the quiz and immediately sees their complete, richer recommendations.

## User Stories

1. As a first-time visitor, I want to take the taste quiz without signing up, so that I can see whether Beerolog's recommendations are actually good before committing to an account.
2. As a guest who completed the quiz, I want to see a few real beer recommendations with match scores and explanations, so that I experience the product's core value.
3. As a guest viewing results, I want a clear, non-intrusive prompt to sign up to unlock the full list, so that I understand the benefit of creating an account.
4. As a guest who decides to sign up, I want my quiz answers preserved automatically, so that I never have to redo the quiz after creating my account.
5. As a newly signed-up user who came from the guest flow, I want to land directly on my full recommendations page with richer matching, so that account creation feels rewarding and instant.
6. As a returning visitor who previously completed the guest quiz but did not sign up, I want my previous answers still available when I come back, so that I can pick up where I left off or sign up later without friction.
7. As a product owner, I want the guest flow to cost nothing in OpenAI API calls, so that the public preview path does not create unbounded AI spend from anonymous traffic.
8. As a product owner, I want to measure how many guests convert to sign-ups, so that the guest flow's effectiveness is observable.
9. As a developer, I want the guest dial-matching function to be a pure, testable computation with no external I/O, so that it can be validated with fast unit tests and cannot degrade under load.
10. As a developer, I want a clean separation between guest and authenticated recommendation paths on the backend, so that adding guest capabilities does not compromise the richer auth-user matching pipeline.

## Implementation Decisions

### New Frontend Route

- A public route at `/try` serves the guest preview experience. It requires no authentication and is accessible to any visitor.
- The `/try` route renders the same adaptive quiz component used in `/onboarding`, configured to write answers to local storage rather than posting to the authenticated onboarding endpoint.
- After quiz completion, the `/try` route posts answers to the guest recommendations endpoint and renders a guest-specific results view.

### Guest Answer Persistence (Frontend)

- Guest quiz answers are persisted in `localStorage` under the key `beerolog:guest_answers`.
- The stored value is a JSON-serialized object matching the same `OnboardingAnswers` schema used by the authenticated onboarding endpoint (the full set of 11 answers keyed by question identifier).
- Answers are written to `localStorage` on quiz completion (not on each individual answer, to avoid partial-state issues).
- On mount, the `/try` route checks for existing guest answers in `localStorage`. If found and the user has not yet signed up, it offers to skip directly to results or retake the quiz.

### New Backend Endpoint: Guest Recommendations

- A new `POST /guest-recommendations` endpoint is added. It is public (no auth required).
- Request body: the full `OnboardingAnswers` object (same schema the authenticated onboarding accepts).
- Processing pipeline:
  1. `compose_dials(answers)` — pure function, produces `BaselineTasteDials` (the numeric dial vector).
  2. `rank_by_dials(dials, catalog, limit)` — NEW pure function (see below). Performs cosine similarity between the guest's dial vector and each beer's precomputed dial-space vector. Returns ranked results.
  3. Response includes the full ranked list but marks which results are "unlocked" (first 3) vs "locked" (remainder). The frontend enforces the blur; the backend still returns all results so that no second request is needed post-signup for the initial view.
- Response body: `{ results: BeerRecommendation[], unlocked_count: 3 }` where each `BeerRecommendation` includes beer metadata, match percentage, and a short "why" line.
- The endpoint does NOT call OpenAI. No embedding, no persona generation, no icon resolution.
- Rate limiting should be applied to this endpoint to prevent abuse (details deferred to infrastructure layer).

### Guest Dial-Based Match Function

- A new service function `rank_by_dials(dials: BaselineTasteDials, catalog: List[CatalogBeer], limit: int) -> List[ScoredBeer]` is added to the match services module.
- It computes cosine similarity between the guest's dial vector (extracted from `BaselineTasteDials` as a numeric array) and each catalog beer's precomputed dial-space vector.
- It returns results sorted by descending similarity score, truncated to `limit`.
- This function is pure (no database access, no network calls). The catalog and its precomputed dial vectors are passed in; the caller is responsible for loading them.
- Each catalog beer must have a precomputed dial-space vector stored alongside its existing embedding vector. If this does not yet exist, a one-time migration or seed script computes it from each beer's known taste attributes.

### Guest vs Authenticated Distinction on Backend

- `POST /guest-recommendations` is the guest path. It accepts raw `OnboardingAnswers`, runs `compose_dials` + `rank_by_dials`, and returns results. No auth token expected or validated.
- `POST /recommendations` remains the authenticated path. It requires a valid Clerk session, looks up the user's stored embedding from the database, and uses `match_engine.rank()` (embedding-based cosine similarity via pgvector).
- The two endpoints share no internal branching or conditional auth logic. They are separate routes with separate handlers to keep the authenticated path's guarantees clean.

### Frontend Results UI: "3 Visible, Rest Blurred"

- The guest results view renders all returned beer cards.
- The first 3 cards are fully interactive: visible artwork, name, style, match %, and "why" line.
- Cards beyond position 3 are rendered with a CSS blur/opacity overlay and are non-interactive (no tap target, no link).
- A sign-up call-to-action is displayed between the 3rd visible card and the blurred section (or overlaid on the blurred area). The CTA links to the Clerk sign-up page.
- The count "3" is driven by the `unlocked_count` field in the API response so it can be adjusted server-side without a frontend deploy.

### Sign-Up Redirect Flow

- The sign-up CTA on the guest results page links to `/signin/$` (Clerk sign-up mode) with the query parameter `?next=/recommendations`.
- After Clerk sign-up completes, Clerk redirects the user to `/recommendations` as specified by the `next` parameter.
- The existing Clerk redirect infrastructure already supports the `?next=` pattern; no new redirect logic is needed in the auth layer.

### Seamless Post-Signup Hydration

- When a newly signed-up user lands on `/recommendations` and has NO existing taste profile in the database, the frontend checks `localStorage` for `beerolog:guest_answers`.
- If guest answers are found, the frontend automatically posts them to `POST /onboarding` (the existing authenticated onboarding endpoint) with the user's new auth token.
- The backend runs the full onboarding pipeline: `compose_dials()` → `compose_text()` → OpenAI embed → save to DB → persona generation → icon resolution.
- On success, the frontend immediately requests `POST /recommendations` (the authenticated path) and renders the full, unblurred recommendation results.
- After successful hydration, the frontend clears `beerolog:guest_answers` from `localStorage` to prevent double-submission.
- If the user already has a taste profile (e.g., they signed in to an existing account rather than signing up fresh), the guest answers are ignored and cleared.
- The hydration is triggered by the recommendations route loader or an effect on mount — not by a separate dedicated route.

### Modified Frontend Modules

- The quiz component (currently used only in `/onboarding`) is extracted or parameterized to accept a mode prop or configuration that controls whether it posts to the authenticated endpoint or writes to `localStorage` and posts to the guest endpoint.
- The recommendations route is modified to include hydration logic (check for guest answers, trigger onboarding if needed).
- A new guest results component is created for the `/try` route's post-quiz view, implementing the 3-visible/rest-blurred layout.

### Modified Backend Modules

- A new route module for the guest recommendations endpoint is added.
- A new service function `rank_by_dials` is added to the match/recommendation services.
- The catalog data layer may need a new field or precomputed artifact for dial-space vectors per beer, depending on how the existing catalog stores taste attributes.
- The existing `POST /onboarding` endpoint requires no modification — it already handles the full pipeline when called with valid auth and answers.

## Testing Decisions

- `rank_by_dials` is a pure function: unit-test it with synthetic dial vectors and a small catalog fixture. Verify correct sort order, score bounds (0–1), and limit truncation.
- `POST /guest-recommendations` integration test: post valid `OnboardingAnswers`, assert 200 response with expected shape, assert no OpenAI calls are made (mock or spy confirms no embedding service invocation).
- `POST /guest-recommendations` validation test: post malformed or incomplete answers, assert 422 with clear error.
- Frontend `/try` route: component test verifying quiz completion triggers `localStorage` write and guest API call.
- Frontend hydration: component test verifying that when `/recommendations` mounts with no DB profile but valid `localStorage` guest answers, it calls `POST /onboarding` then `POST /recommendations` in sequence.
- Frontend blur UI: visual regression or snapshot test confirming that cards beyond position 3 have the blur treatment applied.
- End-to-end (Playwright): full guest-to-signup-to-recommendations journey — take quiz as guest, see 3 results, click sign-up, complete Clerk sign-up (test mode), land on `/recommendations` with full unblurred results and a persisted taste profile.
- Rate-limit test: confirm that rapid repeated calls to `POST /guest-recommendations` from the same IP are throttled appropriately.

## Out of Scope

- Guest session intent (vibe + ABV quick-pick): guests receive recommendations based on baseline dials only. Session intent tuning is an authenticated-only feature.
- Guest persona or icon generation: these require OpenAI calls and are generated only after sign-up during hydration.
- Guest profile page or history: guests have no persisted server-side state.
- A/B testing the number of visible results (3 vs 2 vs 5): the `unlocked_count` field enables this later but experimentation infrastructure is not part of this PRD.
- Social sharing of guest results (e.g., "share your taste profile" link): deferred to a separate social/viral PRD.
- Bot/abuse protection beyond basic rate limiting (e.g., CAPTCHA, fingerprinting): deferred to security hardening.
- Analytics instrumentation for funnel metrics (guest quiz start → completion → sign-up): acknowledged as important but handled by a separate observability PRD.
- Catalog dial-vector precomputation strategy: if a migration is needed, its mechanics are an implementation detail resolved during engineering, not specified here.

## Further Notes

- The guest dial-only matching is intentionally less accurate than the authenticated embedding-based matching. This is a feature, not a bug: it gives registered users a measurably better experience (richer semantic matching, persona, full results) which reinforces the conversion value proposition.
- The `unlocked_count: 3` value in the response is a product lever. Start at 3 and adjust based on conversion data. Fewer visible results may increase urgency; more may increase trust. The backend controls this so changes require no frontend deploy.
- `localStorage` was chosen over `sessionStorage` for guest answers because the value must survive tab closes and browser restarts — a user who leaves and returns days later should not lose their quiz progress.
- If a guest completes the quiz, closes the browser, and later signs up through a path OTHER than the guest results CTA (e.g., direct navigation to `/signin`), the hydration logic on `/recommendations` still detects and processes the stored guest answers. The mechanism is not coupled to the specific CTA; it triggers whenever an authenticated user without a profile has guest answers in storage.
- The guest endpoint returns all results (not just 3) so that if the unlock count changes, the frontend can adjust without a new API call. The blur is a frontend concern; the backend provides the full data and the policy (`unlocked_count`).
