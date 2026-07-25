# PRD: Shareable Beer Taste Archetype (Growth Loop)

- Status: Draft
- Type: enhancement
- Design source: `/plan` growth-strategy session (2026-07-22), approved plan `splendid-crafting-moler`
- Related PRDs: [guest-preview](./guest-preview.md) (the `/try` top-of-funnel this loop feeds), [beer-detail-view](./beer-detail-view.md) (public `/beer/{id}` share precedent), [friend-challenge](./friend-challenge.md) (post-launch social, out of scope here)
- Related ADRs: [0005 richer taste model](../adr/0005-richer-taste-model-and-adaptive-quiz.md), [0007 agent-ready interfaces](../adr/0007-agent-ready-interfaces.md)

## Problem Statement

Beerolog needs organic growth to go public. Today it has no viral loop. The only
share surface is a single button on the recommendations page that links to an
objective `/beer/{id}` page, and even that link renders as **bare text** when
pasted anywhere — there is **zero Open Graph / social-image infrastructure** in
the codebase (no `og:*` meta, no `@vercel/og`, no `twitter:card`). The richest,
most identity-expressing artifact the product produces — a person's **taste
profile** — is authenticated-only (`TasteProfileSummary` on the home route) and
has no public, shareable surface at all. There is no share prompt at the moment a
user is most excited (right after seeing their result), and guests who take the
public `/try` quiz have nothing to share.

The research on consumer-app growth is unambiguous: the fastest loop is a **named
identity card** (Spotify Wrapped, BuzzFeed archetypes, 16Personalities) — data
turned into a *flattering, slightly surprising, collectible* type that users share
to signal taste. Beerolog already computes the underlying data (a dial-vector
taste profile for every user and every guest) but does nothing shareable with it.

## Solution

Turn each person's taste into a **named archetype** (~12 deterministic types such
as `hop-chaser`, `malt-romantic`, `sour-seeker`, `roast-devotee`,
`crisp-classicist`, `adventurer`) and build the smallest loop that closes:

> finish quiz → see your **named archetype** → share a branded vertical (9:16)
> card to Instagram Stories → recipient goes to `beerolog.com/try` → gets their
> own archetype → shares.

Key shape decisions (locked with the product owner in the plan session):

- **Named archetype, not the per-user LLM persona.** Deterministic named types are
  *collectible* ("I'm a Hop Chaser too!"), work for signed-out guests with no LLM
  call, and render consistently. The existing LLM persona stays as the in-app
  personalized blurb for signed-in users; it is not the shared artifact.
- **Guests share pre-signup.** The viral action happens at the `/try` reveal,
  before any account wall — friction there kills the loop.
- **Instagram Stories first.** The hero artifact is a vertical 1080×1920 image the
  user drops into a Story; OG link-preview (1200×630) is a near-free fast-follow.
- **No database.** The archetype key lives in the URL (`/taste/{key}`), so the
  card shows the *archetype's* representative radar, not the user's exact dials.
  ~12 keys × 2 locales × 2 sizes = a handful of CDN-cacheable images, no
  `taste_shares` table, no share-tracking schema.
- **One derivation, server-side.** Dials already exist server-side in both flows;
  a single pure `derive_archetype(dials)` runs in the API and returns the key on
  both the guest-recs and baseline responses. The frontend never does dial math.

## User Stories

1. As a guest who finished the `/try` quiz, I want to see my named beer-taste archetype, so that I get a fun, identity-expressing result worth sharing.
2. As a guest, I want to share my archetype **without creating an account**, so that nothing blocks me at the moment I want to share.
3. As a mobile user, I want a "Share your type" action that opens the native share sheet with a ready-made vertical card image, so that I can drop it straight into an Instagram Story.
4. As a user without native share support, I want a copy-link fallback to my archetype page, so that I can still share.
5. As a recipient who opens a shared `/taste/{key}` link, I want to see that archetype's card plus a clear "What's YOUR type? take the 30-second quiz" CTA, so that I am pulled into the loop.
6. As a recipient who pastes or receives a `/taste/{key}` link in WhatsApp/social, I want a rich preview card (image + title), so that the link is enticing rather than bare text.
7. As a signed-in user viewing my taste profile, I want to share my archetype from the home page, so that existing users also feed the loop.
8. As a Hebrew-speaking user, I want the archetype name, tagline, card, and share copy in natural Israeli Hebrew, so that it matches the rest of the app.
9. As a product owner, I want archetype derivation to be a pure, deterministic, LLM-free function, so that the guest path stays zero-cost and the result is testable and stable.
10. As a product owner, I want the same archetype key returned by both the guest and authenticated paths, so that there is one source of truth and no drift.
11. As a product owner, I want to measure share→quiz-start conversion, so that the loop's K-factor is observable (fast-follow, using the already-mounted Vercel Analytics).
12. As a user, I want the shared card to carry the Beerolog brand look (chalkboard: espresso/cream/gold, Oswald display, custom icon), so that the artifact is recognizably Beerolog.
13. As a user on any archetype link, I want an unknown/invalid key to 404 cleanly, so that broken links fail safely.

## Implementation Decisions

### Archetype derivation (API, LLM-free) — Slice 1

- Add `derive_archetype(dials) -> ArchetypeKey` in `apps/api`: pure and
  deterministic, keyed off the dominant `flavor_family` plus
  bitterness / novelty / body / abv thresholds, mapping any dial vector to exactly
  one of the ~12 archetype keys. No OpenAI call, no I/O.
- Return `archetype: { key }` from `POST /guest-recommendations` and the baseline
  load endpoint (the two paths that already have dials in hand). Regenerate the
  web API types (`pnpm --filter @beerolog/web api:generate`).
- The key set is a closed enum shared conceptually with the frontend metadata map
  (Slice 2); a test asserts every key the API can emit has frontend metadata.

### Archetype metadata + card component (web) — Slice 2

- `apps/web/src/lib/archetypes.ts`: const-object map
  `key → { icon, nameEn, nameHe, taglineEn, taglineHe, traits, radar }`
  (const-object enum per `docs/agents/frontend-conventions.md`).
- Icons are **custom SVGs via `@beerolog/icons`** (one per archetype, clearly
  representative — no emoji, per the repo icon rule).
- `ArchetypeCard.tsx` is presentational, brand chalkboard styling, reusing the
  existing radar primitive (`apps/web/src/lib/taste-radar.ts`, as used by
  `TasteProfileSummary.tsx`). A `variant` prop drives two layouts: an in-app
  reveal layout and a full-bleed 9:16 share layout. Hebrew fallbacks per the
  design guide (Secular One / Gveret Levin; RTL drops uppercase).

### Public share route `/taste/$key` — Slice 3

- New `apps/web/src/routes/taste.$key.tsx`, modeled on `apps/web/src/routes/beer.$id.tsx`.
  Renders `ArchetypeCard` (reveal variant) + a prominent `Link to="/try"` CTA,
  locale-aware. Unknown key → 404.
- Add TanStack `head()` on the route (rendered by the `<HeadContent />` already
  wired in `__root.tsx`) emitting `og:title`, `og:description`, `og:url`,
  `og:image` (the `size=og` image) and `twitter:card=summary_large_image`.

### Social image endpoint (`@vercel/og`) — Slice 4

- Add `@vercel/og` to `apps/web`. A server route renders the archetype card to
  PNG via `ImageResponse`, keyed by `key` + `?lang=he|en` + `?size=story|og`
  (`story` = 1080×1920 for IG, `og` = 1200×630 for link previews).
- Images are pure functions of their params → send long-lived `immutable` cache
  headers. Wired as a TanStack Start server route (Nitro/Vercel `preset: 'vercel'`),
  reusing the Slice-2 archetype metadata.

### Share triggers at the reveal moment — Slice 5 (closes the loop)

- Add a primary "Share your type" action at the **guest `/try` reveal**
  (`apps/web/src/routes/try.tsx` results view / `GuestResults`) and on the
  **signed-in home** (`apps/web/src/routes/index.tsx`, near `TasteProfileSummary`).
- Reuse the existing pattern in `recommendations.tsx` `shareResults()`
  (`navigator.share` + `navigator.clipboard` fallback, "ponytail: no share lib").
  On mobile, fetch the `size=story` PNG blob and pass it via
  `navigator.share({ files: [...] })` so it drops into an IG Story; fallback =
  copy the `/taste/{key}` link.
- Localized copy in `apps/web/src/i18n/locales/{en,he}/common.json`
  (`share.taste.cta`, `share.taste.text`) — natural Israeli Hebrew, `שלכם` register.

### Fast-follow (near-free once infra exists — not a launch slice)

- Backfill `og:image` (`size=og`) on `/beer/{id}` and `/try` via their `head()`
  so every pasted Beerolog link gets a rich preview.
- Attribution: append `?from=share` to the `/taste` CTA and fire a Vercel
  Analytics custom event (already mounted — no new dependency) to measure the
  share → quiz-start K-factor.

## Explicitly Out of Scope

- No `taste_shares` table, share-tracking DB, referral codes, or reward mechanics.
- No friend-challenge / group-session / leaderboard surfaces (post-launch per
  their existing PRDs).
- No per-user LLM persona in the *shared* card (it remains the in-app blurb).
- No new analytics platform (reuse the mounted Vercel Analytics for the fast-follow).

## Acceptance Criteria (feature-level)

- `derive_archetype` maps representative dial vectors to the expected keys and is
  total (every valid dial vector yields exactly one key); covered by unit tests.
- Both `POST /guest-recommendations` and the baseline load response include
  `archetype.key`; web API types regenerated.
- `/taste/{key}` renders the branded card + `/try` CTA in both locales and 404s on
  an unknown key, and emits OG + Twitter meta pointing at a valid `size=og` image.
- The image endpoint returns valid PNGs at 1080×1920 (`size=story`) and 1200×630
  (`size=og`) for every key in both locales, with immutable cache headers.
- From the `/try` reveal, a guest can share their archetype (native sheet with the
  story image, or copy-link) **without signing up**; opening the link lands on
  `/try`.
- `pnpm --filter @beerolog/web test`, `typecheck`, and `lint` pass; API tests pass.

## Vertical Slices → Issues

1. **Slice 1 — Archetype derivation (API)** — [#285](https://github.com/Sa-ar/beerolog/issues/285): `derive_archetype` + `archetype.key`
   on guest-recs & baseline responses; unit test; regenerate web types.
2. **Slice 2 — Archetype metadata + `ArchetypeCard` (web)** — [#286](https://github.com/Sa-ar/beerolog/issues/286): const-object map,
   custom `@beerolog/icons` SVGs, presentational card with reveal + 9:16 variants. (Blocked by #285.)
3. **Slice 3 — Public `/taste/$key` route + OG/Twitter meta** — [#287](https://github.com/Sa-ar/beerolog/issues/287). (Blocked by #286, #288.)
4. **Slice 4 — `@vercel/og` image endpoint** (`story`/`og`, both locales, cached) — [#288](https://github.com/Sa-ar/beerolog/issues/288).
   (Blocked by #286.)
5. **Slice 5 — Share triggers at `/try` and home** — [#289](https://github.com/Sa-ar/beerolog/issues/289): wiring `navigator.share` with
   the story image + localized copy. (Blocked by #287, #288.)
