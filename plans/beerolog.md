# Plan: Beerolog

> Source PRD: [GitHub Issue #1](https://github.com/Sa-ar/beerolog/issues/1)

## Architectural decisions

Durable decisions that apply across all phases:

- **Monorepo**: Turborepo + pnpm workspaces — `apps/web`, `apps/api`, `packages/types`, `packages/db`, `packages/ui`
- **Frontend**: TanStack Start (TypeScript) deployed on Vercel
- **Backend**: Python FastAPI deployed on Railway
- **Database**: Neon PostgreSQL + pgvector with HNSW indexes
- **Auth**: Amazon Cognito — OAuth via Google/Apple; JWT validated in FastAPI middleware
- **ORM**: Drizzle (schema + migrations in `packages/db`); asyncpg in Python API
- **Design system**: `@beerolog/ui` — BaseUI headless primitives + Tailwind CSS
- **Embeddings**: OpenAI `text-embedding-3-small` (1536-dim); one call per profile update, not per request
- **Recommendation**: Hybrid — deterministic 7-dim cosine scoring first, LLM generates natural-language explanation for top results
- **Flavor vector**: Versioned contract `v1 = { bitterness, sweetness, fruitiness, roast, sourness, body, adventure }` all 0–1. Schema version stored on every user profile and beer. Changing dimensions is a breaking migration.

**Routes**

| Path | Purpose |
|---|---|
| `/` | Home / quiz entry |
| `/quiz` | Taste quiz flow (anonymous) |
| `/quiz/group/:sessionId` | Group participant quiz join |
| `/results` | Recommendation results (no venue) |
| `/results/:venueId` | Venue-scoped recommendation results |
| `/scan/:venueId?` | Menu scanner |
| `/profile` | User profile + persona |
| `/profile/history` | Beer history |
| `/challenge/:challengeId` | Friend challenge quiz entry |
| `/venue/:venueId` | Venue page — tap list + leaderboard |
| `/venue/:venueId/manage` | Bar dashboard — tap list management |
| `POST /recommendations` | API — score + explain |
| `POST /embeddings` | API — embed a flavor vector or text |
| `GET /health` | API — health check |

**Key schema tables** (all exist from Phase 0 scaffold)
`users`, `user_profiles`, `beers`, `venues`, `venue_tap_list`, `beer_ratings`, `group_sessions`, `group_participants`, `friendships`

---

## Phase 1: Anonymous recommendation core loop

**User stories**: 1, 2, 10, 11, 12, 13, 40
**GitHub issues**: #3 (beer catalog), #5 (quiz), #6 (recommendation engine), #7 (solo flow)

### What to build

The complete anonymous path: take the quiz, get ranked recommendations. No account, no venue — just the core value demonstrated end to end.

The beer catalog is seeded with ~100 beers across all major style families, each with a populated flavor vector. The quiz runs in plain language with branching logic and produces a valid flavor vector on every path. The recommendation engine scores beers by cosine similarity against the taste vector and returns three labeled slots: Best pick, Backup, More adventurous. A placeholder explanation accompanies each result (LLM explanations land in Phase 4).

The results screen is readable in dim bar lighting: large text, high contrast, three labeled cards.

### Acceptance criteria

- [ ] 100+ beers seeded across lager, pilsner, kölsch, wheat, pale ale, IPA, amber, brown, stout, porter, sour, saison, dunkel, vienna lager
- [ ] Every beer has all 7 flavor vector dimensions populated
- [ ] Admin can add/edit/merge beers via a management UI
- [ ] Quiz completes in under 2 minutes; all questions in plain language with no beer jargon
- [ ] Every answer path produces a valid, fully-populated flavor vector
- [ ] "Not sure" answers produce centered values (~0.5) for that dimension
- [ ] Branching logic skips irrelevant questions based on prior answers
- [ ] Recommendations ranked by cosine similarity; Best/Backup/Adventurous slots clearly labeled
- [ ] "Give me another option" returns the next-ranked beer without re-running the quiz
- [ ] UI is readable in dim light (large text, high contrast)
- [ ] Flow works on mobile web

---

## Phase 2: Venue integration + menu scanner

**User stories**: 8, 9, 14, 35, 36, 37, 38, 39
**GitHub issues**: #4 (venue service), #9 (menu scanner)

### What to build

Bars get profiles with managed tap lists and QR codes. Users entering via a QR code skip the "what's available" step — the venue's live tap list is pre-loaded into the recommendation flow. The menu scanner lets any user at any bar photograph the tap board; a vision LLM extracts beer names and fuzzy-matches them to the catalog, handling handwritten or non-standard formats.

If no venue profile exists, the flow degrades gracefully: the user is prompted to scan or browse manually.

### Acceptance criteria

- [ ] Bar can create a venue profile and manage their tap list via a web dashboard
- [ ] Tap list CRUD: add, remove, toggle active/inactive per beer
- [ ] Each venue has a unique QR code that opens the app pre-loaded with that venue's tap list
- [ ] Scanning a QR code without an account still reaches the recommendation flow
- [ ] Vision LLM extracts beer names from a tap board photo and matches to catalog
- [ ] Low-confidence matches shown as confirmations; unmatched entries queued for admin review
- [ ] Matched beer list feeds directly into the Phase 1 recommendation flow
- [ ] Venues with no profile degrade gracefully to scan or browse

---

## Phase 3: Group mode

**User stories**: 15, 16, 17, 18, 19, 20, 21
**GitHub issues**: #8 (group session)

### What to build

A group host creates a session and shares a link (via WhatsApp or any messaging app). Each participant takes the quiz on their own device — no account required. The host sees real-time completion status and can request the group recommendation at any point regardless of how many members have finished.

The group recommendation aggregates all submitted flavor vectors into a weighted average. High-variance dimensions (conflicting preferences) are flagged in the UI. A shareable group result card is generated as an exportable image. Sessions expire after 4 hours.

### Acceptance criteria

- [ ] Host creates a session and receives a shareable link
- [ ] Participants complete the quiz via link without creating an account
- [ ] Host sees real-time completion status (X of Y answered)
- [ ] Group recommendation available on demand — not gated on full completion
- [ ] Conflicting preference dimensions flagged in the group result
- [ ] Group result card exportable as a shareable image
- [ ] New joins rejected after 4-hour session expiry
- [ ] Session with 0 completions returns a graceful empty state

---

## Phase 4: LLM explanation layer

**User stories**: 11 (full)
**GitHub issues**: part of #6 (recommendation engine)

### What to build

Replace the placeholder explanations from Phase 1 with real LLM-generated copy. For each of the three recommendation slots, the LLM receives the user's flavor vector and the beer's attributes and returns one confident, social sentence — not hedging language. Tone: "This is a strong pick for you" not "You might enjoy this."

The LLM call is one request per recommendation result (all three explanations in one call), not one per beer.

### Acceptance criteria

- [ ] All three recommendation slots have LLM-generated explanations
- [ ] Explanations are confident in tone — no hedging language
- [ ] One LLM call per recommendation result, regardless of how many beers are ranked
- [ ] Explanation references something specific about the user's taste vector (not generic copy)
- [ ] Latency from quiz completion to results displayed under 3 seconds on a typical connection

---

## Phase 5: User accounts + persistent taste profile

**User stories**: 3, 4, 5, 24
**GitHub issues**: #10 (user accounts)

### What to build

Users can sign up via Google or Apple OAuth through Cognito. After completing the quiz anonymously, the taste profile migrates to the new account on sign-up — no data is lost. The taste vector, beer history, and persona persist across sessions and devices.

Returning users with a saved profile are recognized and get a shortened quiz (3–4 questions) since dimensions already known with high confidence are skipped.

### Acceptance criteria

- [ ] Sign up and log in via Google OAuth and Apple OAuth
- [ ] Anonymous quiz result migrates to user profile on sign-up
- [ ] Taste vector and beer history persist across sessions and devices
- [ ] Beer history screen shows all beers tried with rating and date
- [ ] Returning user with saved profile gets a shortened quiz (known dimensions skipped)

---

## Phase 6: Post-drink rating + profile refinement

**User stories**: 22, 23, 25, 41
**GitHub issues**: #11 (rating + refinement)

### What to build

After a beer is ordered, a 3-tap rating prompt appears: Loved it / It was fine / Not for me. "Loved it" nudges the taste vector toward the rated beer's attributes. "Not for me" nudges it away and suppresses similar styles for the next several recommendation sessions (suppression is temporary, not permanent). Ratings are stored and power the social proof queries in Phase 9.

Rating does not mutate the vector for anonymous users.

### Acceptance criteria

- [ ] 3-tap rating prompt appears after a beer is selected (dismissible)
- [ ] "Loved it" nudges the taste vector toward the beer's flavor attributes
- [ ] "Not for me" suppresses similar-style beers for the next N sessions
- [ ] Style suppression expires — it is not permanent
- [ ] Ratings appear in beer history
- [ ] Anonymous user ratings are stored but do not mutate the taste vector

---

## Phase 7: Beer persona + shareable cards

**User stories**: 6, 7
**GitHub issues**: #12 (persona)

### What to build

A Beer Persona is derived from the dominant dimensions of the user's taste vector. Ten personas cover the main flavor profile clusters, each with a name, icon, and short description that are fun and jargon-free. The persona recalculates after each profile update and is displayed prominently in the user's profile. The persona card is exportable as an image for social sharing.

Persona taxonomy (10 total): The Hop Head, The Dark Side Explorer, The Easy Sipper, The Sour Seeker, The Malt Lover, The Wheat Wanderer, The Session King, The Bold Adventurer, The Crisp Purist, The Roast Devotee.

### Acceptance criteria

- [ ] 10 personas defined with name, icon, and description
- [ ] Persona derived deterministically from dominant taste vector dimensions
- [ ] Persona displayed in user profile
- [ ] Persona card exportable as a shareable image (OG-card compatible)
- [ ] Persona updates automatically when the taste vector changes significantly
- [ ] No beer jargon in persona names or descriptions

---

## Phase 8: Friend challenge + taste comparison

**User stories**: 27, 28
**GitHub issues**: #13 (friend challenge)

### What to build

A logged-in user generates a challenge link from their profile. A friend takes the quiz via the link without needing an account. After the friend completes the quiz, both parties see a side-by-side taste comparison card showing shared preferences and notable differences. The card is exportable as a shareable image. Challenge links expire after 7 days. The challenger receives an in-app notification when the challenge is accepted.

### Acceptance criteria

- [ ] Logged-in user can generate a challenge link from their profile
- [ ] Friend takes the quiz via link without an account
- [ ] Both parties see a You vs Friend comparison card after completion
- [ ] Comparison card shows shared and differing preferences
- [ ] Card exportable as a shareable image
- [ ] Challenge links expire after 7 days
- [ ] Challenger notified in-app when friend accepts

---

## Phase 9: Social proof + bar leaderboard

**User stories**: 29, 30, 31
**GitHub issues**: #14 (social proof), #16 (leaderboard)

### What to build

Users can connect with friends. When viewing beers at a venue, a count of friend recommendations is shown if any connected friends have positively rated that beer at the same bar. Social proof is venue-scoped. Users can toggle whether their ratings are visible to friends.

Each venue page shows a leaderboard of top recommenders ranked by how many of their recommendations friends have positively rated. The user's own rank is always visible even outside the top 10.

### Acceptance criteria

- [ ] Users can connect with friends (by username or link)
- [ ] Beer cards at a venue show friend recommendation counts where applicable
- [ ] "Recommended by [name]" shown for single-friend recommendations
- [ ] Social proof is venue-scoped
- [ ] Users can disable ratings visibility to friends
- [ ] Venue leaderboard ranks users by positive friend recommendation count
- [ ] User's own rank always visible on leaderboard
- [ ] Leaderboard excludes users with privacy toggled off

---

## Phase 10: Badge engine + taste evolution

**User stories**: 26, 32, 33, 34
**GitHub issues**: #15 (badge engine)

### What to build

Four badge types track key milestones and make the expert identity tangible:

- **Bar explorer**: Progress ring per venue — unique beers tried; milestone badges at 25%, 50%, 100%
- **First-timer**: Awarded when the user is among the first 5 to rate a new tap at a venue they frequent
- **Expert level**: Increments when a friend positively rates a beer the user recommended; milestone prompts at 5, 10, 25
- **Taste evolution**: Snapshot taste vector at onboarding; compare to current; shareable card when cumulative drift crosses a threshold

### Acceptance criteria

- [ ] Bar explorer ring visible on venue screen, updates after each new rating
- [ ] First-timer badge awarded correctly (rating timestamp vs. beer's first appearance at that venue)
- [ ] Expert level increments correctly when a friend positively rates a recommended beer
- [ ] Milestone prompt ("You're becoming the go-to beer person") fires at 5, 10, 25 expert points
- [ ] Taste evolution card generated and shareable when drift threshold is crossed
- [ ] All badges visible in user profile badge collection
