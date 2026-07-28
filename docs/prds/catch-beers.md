# PRD: Catch beers with photo proof, shareable

- Status: Ready
- Parent ADR: [docs/adr/0011-catch-proof-by-presence.md](../adr/0011-catch-proof-by-presence.md)
- Related ADR: [docs/adr/0009-international-scaling-and-white-label-tenancy.md](../adr/0009-international-scaling-and-white-label-tenancy.md)
- Glossary: `Catch`, `Proof`, `ProofSource`, `CatchCollection`, `Set` in [CONTEXT.md](../../CONTEXT.md)

## Problem Statement

A signed-in user drinks a beer and rates it, but that rating is invisible and disposable
— there is nothing to *keep*, nothing that feels earned, and nothing worth showing anyone.
The app has no surface where a user can look back at the beers they have actually had, no
artifact they would want to post, and therefore no organic reason for a friend to hear about
Beerolog. For the white-label business, bars have no lightweight mechanic to reward regulars
for working through a tap list.

## Solution

Let a user **Catch** a beer: a `Rating` becomes a `Catch` once the user attaches `Proof` —
a single photo of the actual glass or bottle, accepted on the honor system (presence
required, content not verified; see ADR 0011). Caught beers accumulate into a personal,
unbounded **`CatchCollection`** grid. At the moment of catching, the user can share a
single-catch card (their photo + the beer + their match% / rating, branded), reusing the
existing `@vercel/og` archetype pipeline. Completing a defined **`Set`** (a finite curated
group, e.g. "Israeli Craft Starter") unlocks a collection-brag card to share. The catch is
just the existing `Rating` plus proof — no new "catch" entity — so every beer a user has
rated becomes retroactively catchable by adding a photo.

The only genuinely new infrastructure is user photo upload to Vercel Blob. Everything else
is assembly over `beer_ratings`, the `@vercel/og` share pipeline, and `shareArchetype.ts`.

## User Stories

1. As a signed-in user, I want to add a photo to a beer I rated, so that the beer becomes a Catch I can keep.
2. As a user, I want the catch to require a photo, so that each catch feels earned rather than a throwaway tap.
3. As a user rating a beer, I want to snap or pick a photo inline, so that catching is one continuous flow, not a separate chore.
4. As a user, I want a rating without a photo to still be saved as a plain rating, so that I am not forced to catch if I only want to rate.
5. As a user, I want to go back to an old rating and add a photo later, so that beers I rated before this feature can still be caught.
6. As a user, I want to see all the beers I have caught in one grid, so that I have a personal collection to look back on.
7. As a user, I want my caught beers to show my own proof photo, so that the collection feels like mine and not a stock catalog.
8. As a user, I want to see how many beers I have caught, so that I get a sense of progress.
9. As a user, I want to tap a caught beer to see its detail and my photo, so that I can revisit the specific beer and occasion.
10. As a user, at the moment I catch a beer, I want to share a card with my photo and the beer, so that I can post the moment at peak enthusiasm.
11. As a user, I want the share card to carry the Beerolog brand, so that friends who see it know where it came from.
12. As a user on mobile, I want the native share sheet, so that I can post to whichever app I use.
13. As a user on desktop, I want a copy-link / copy-image fallback, so that sharing still works without a native share sheet.
14. As a Hebrew-speaking user, I want the share card and collection copy in natural Hebrew, so that it reads right for me.
15. As a user, I want to see a defined Set of beers and which of them I have caught, so that I have a goal to complete.
16. As a user, I want the Set to show what I am still missing, so that I know which beers to catch next.
17. As a user who catches every beer in a Set, I want to unlock a collection-brag card, so that I can share the accomplishment.
18. As a user, I want the collection-brag card to only appear once the Set is actually complete, so that the brag is honest.
19. As a user, I want my proof photo stored durably, so that my collection does not lose its images over time.
20. As a user, I want catching to work with one photo per beer, so that the model stays simple and matches one-rating-per-beer.
21. As a product owner, I want the catch/proof/set model to carry a `ProofSource` seam, so that white-label can later add venue-verified catches without a schema rewrite.
22. As a bar operator (future / white-label), I want to define my tap list as a Set with a reward, so that regulars are incentivised to work through it — deferred, but the seam exists now.

## Implementation Decisions

- **A Catch is a `Rating` plus `Proof`, not a new entity.** Extend `beer_ratings` rather than
  adding a `catches` table. This preserves the one-rating-per-user-per-beer uniqueness and a
  single source of truth for "I had this beer".
- **Schema change on `beer_ratings`:** add `proof_photo_url` (text, nullable) and
  `proof_source` (enum-like text discriminator, nullable). A row is a Catch iff
  `proof_photo_url` is present. `proof_source` values: `self_photo` (v1, honor system) is the
  only value written now; `venue_verified` reserved and deferred (ADR 0011). Migration must be
  idempotent (nullable add), safe on prod.
- **Proof upload module** (`uploadProof`): accepts an image file, uploads to Vercel Blob under a
  user-scoped key, returns the Blob URL. Requires a Blob **write** token in the web app
  (new — today only a build-time catalog script writes to Blob). One upload endpoint. No
  vision / content verification (ADR 0011). Enforce a max file size and image MIME allowlist
  at the trust boundary.
- **Catch derivation module:** pure logic deriving catch state from a rating
  (`hasProof(rating) → boolean`) and assembling a `CatchCollection` (the user's caught beers)
  from their ratings. No new persistence — a read-model over `beer_ratings` joined to `beers`.
- **Set progress module** (`computeSetProgress`): pure function
  `(setBeerIds, caughtBeerIds) → { caught, total, isComplete, missing }`. A `Set` is a static,
  code-defined list of beer IDs for v1 (one demo Set, e.g. "Israeli Craft Starter"); no Set
  table, no admin UI. Completion is derived, never stored.
- **Share cards:** extend the existing `api.og.taste.$key` Satori pipeline with two new
  variants — a **single-catch card** (user proof photo composited in, beer name/style,
  match% or rating, brand) and a **collection-brag card** (Set name + completion). Reuse the
  lazy-load-`@vercel/og`-inside-handler pattern (ADR / prior outage) and the immutable cache
  headers. Reuse `shareArchetype.ts` for the `navigator.share` + clipboard fallback.
- **Collection surface:** a new route rendering the `CatchCollection` grid and the demo Set's
  progress, using a TanStack Query hook (no hand-rolled `useEffect` fetch). Beer images fill
  card height per the existing card convention; caught cards prefer the user's proof photo.
- **UI reuse:** `@beerolog/ui` primitives, `@beerolog/icons` custom SVGs (no emoji), i18n copy
  in `en` + `he`, `PAGE_SHELL` width, sidebar nav on desktop.
- **Out-of-scope seams deliberately left unbuilt:** `venue_verified` proof, QR/receipt codes,
  "top X%" percentile share, locked-silhouette completion board, Set admin/CRUD, white-label
  tenant scoping. The schema discriminator is the only concession to them now.

## Testing Decisions

Good tests here assert **external behavior**, not internals: given inputs, assert the derived
output or the persisted/returned shape — never how the function computes it. Prior art: the
taste-model and match scoring tests exercise pure scoring functions with fixed inputs; the OG
route has render smoke coverage; follow those patterns.

All modules are marked for tests (per owner decision):

- **Set progress (`computeSetProgress`)** — pure unit tests over edge cases: empty Set, all
  caught (`isComplete`), none caught, partial with correct `missing`, duplicate beer IDs, and
  a beer in the Set that is absent from the user's catches. The load-bearing brain of
  "catch 'em all" — must be exhaustively covered.
- **Catch derivation** — unit tests: a rating with a proof photo is a Catch, a rating without
  is not; `CatchCollection` assembly returns exactly the caught beers, de-duplicated,
  newest-first.
- **Proof upload (`uploadProof`)** — integration test with the Blob client mocked: happy path
  returns a URL; oversize file and disallowed MIME are rejected at the boundary.
- **Catch OG cards** — snapshot/smoke tests that both variants render a valid image response
  for `en` and `he`, `og` and `story` sizes, and do not crash on a missing proof photo.

## Out of Scope

- Any verification of photo *content* (vision plausibility, anti-fraud) — ADR 0011.
- `venue_verified` proof, venue QR codes, receipt codes, and any real-presence signal.
- "Top X% of people" percentile / leaderboard sharing — deferred until user scale makes the
  number honest (still in CONTEXT.md deferred surfaces).
- Locked-silhouette "gotta catch 'em all" board showing uncaught catalog beers.
- Multiple photos per catch, editing/retaking proof after the fact (beyond adding one later),
  or a proof gallery.
- Set authoring/CRUD, multiple Sets, per-venue Sets, Set rewards/promos, and white-label
  tenant scoping of catches or Sets — the `ProofSource` discriminator is the only seam built.
- Moderation / reporting of user-uploaded photos beyond size + MIME validation (revisit under
  the compliance program, ADR 0004, if user uploads broaden).

## Further Notes

- This feature lives on the B2C demo shell but is intentionally a white-label preview: the
  `Set`-with-reward mechanic is the bar promo ("catch all our taps → free pint"), and the
  `ProofSource` seam is what lets a venue-verified tier land later without reshaping data.
- The single new cost center is user → Blob upload; everything else is reuse. Keep the Blob
  write token server-side only.
- Respect the memory note: Drizzle migrations that pass PR CI can still break prod — keep the
  `beer_ratings` column adds nullable and idempotent.
