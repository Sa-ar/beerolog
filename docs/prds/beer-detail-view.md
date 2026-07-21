# PRD: Per-Beer Detail View with Sensory Radar

- Status: Draft
- Type: enhancement
- Parent feedback: [docs/feedback/2026-07-results-page-review.md](../feedback/2026-07-results-page-review.md) (item 1)
- Related ADRs: [0003 two-layer taste](../adr/0003-two-layer-taste-architecture.md), [0005 richer taste model](../adr/0005-richer-taste-model-and-adaptive-quiz.md), [0007 agent-ready interfaces](../adr/0007-agent-ready-interfaces.md)
- Design source: resolved in a `/grill-with-docs` session (2026-07-21)

## Problem Statement

After completing the quiz, a signed-in user lands on the recommendations page and
sees a ranked list of beer cards. The page is a dead-end: each card shows a name,
badges, a one-line `why`, and a rating tapper, but there is nowhere to go *deeper*
on a beer, no visual sense of what a beer actually tastes like, and no way to see
how a pick relates to their own taste. A reviewer — whose picks the matcher
"nailed" — asked for a richer per-beer view "with emphasis on the graphs,"
pointing at a wine site's product page, and framed the overall goal as **making
the last page more active**. Today the only per-beer signal is text.

## Solution

Give every recommended beer a **detail view built around a sensory radar**,
reachable two ways from one shared component:

- **In-results modal.** Tapping a recommendation card opens a `<dialog>` modal
  (the same pattern used for image-enlarge) showing the beer's sensory radar with
  the user's own taste **overlaid on the same axes** — "how this beer compares to
  what you like." This keeps the user on the recommendations page and makes it
  active, and it is inherently personal.
- **Shareable standalone route `/beer/{id}`.** A public page rendering the same
  detail component with the **objective** radar only (no personal overlay), plus a
  call to action to take the quiz. This is the shareable artifact behind the
  results page's Share action, and doubles as the crawlable public catalog page
  deferred in ADR-0007.

The radar reuses the existing hand-rolled `TasteRadar` (no chart dependency),
extended to draw a second polygon for the overlay. Axes are chosen so every
displayed value is backed by dense, real data.

## User Stories

1. As a signed-in user on my recommendations, I want to tap a beer card and see a detail view, so that I can learn more about a pick without leaving the page.
2. As a signed-in user, I want a sensory radar for each beer, so that I can grasp its character (bitterness, strength, adventurousness) at a glance instead of parsing text.
3. As a signed-in user, I want my own taste overlaid on the beer's radar, so that I can see *how this beer relates to what I like*, not just its raw profile.
4. As a signed-in user, I want the beer's color shown visually, so that I can picture what it looks like in the glass.
5. As a signed-in user, I want the beer's ABV, style, and market tier visible in the detail view, so that I have the practical facts in one place.
6. As a signed-in user, I want the beer's `why-this-beer` explanation in the detail view, so that the match rationale travels with the deeper content.
7. As a signed-in user, I want to close the modal with Escape, a close control, or tapping the backdrop, so that returning to the list is effortless.
8. As a signed-in user, I want body and sweetness shown when they are known for a beer, so that I get extra detail where it exists without seeing blank axes where it does not.
9. As a signed-in user, I want the modal to open instantly from data already loaded, so that opening a detail view never feels like waiting on the network.
10. As a user who received a shared beer link, I want to open `/beer/{id}` and see the beer's objective profile, so that I understand the recommendation even if I have no account.
11. As a logged-out visitor on a shared beer page, I want a clear prompt to take the 30-second quiz, so that I can find out how that beer matches *my* taste.
12. As a Hebrew-speaking user, I want the detail view, axis labels, and CTA fully in Hebrew, so that the experience matches the rest of the app.
13. As a user on a phone, I want the detail view to render legibly at small widths, so that the radar and facts are usable on mobile.
14. As a user relying on a screen reader, I want the radar to carry a meaningful text alternative and the modal to trap focus, so that the detail view is accessible.
15. As a user, I want the objective radar to look the same in the modal and on the shared page, so that the shared artifact is recognizably the same thing I saw.
16. As an external agent or crawler, I want `GET /catalog/{id}` to return the beer's sensory attributes, so that structured beer data is available programmatically.
17. As a signed-in user whose taste profile is momentarily unavailable, I want the modal to still show the objective radar, so that a missing overlay never blocks the detail view.
18. As a product maintainer, I want body/sweetness surfaced only where present, so that we never present a guessed value as a fact.

## Implementation Decisions

### Content: layered radar (objective + personalized overlay)

The detail view leads with an **objective sensory radar** and, in the modal only,
overlays the user's `BaselineTaste` dials on the same axes. The raw `Match`
`breakdown` scores are **not** surfaced — they are internal scoring data already
reduced to the user-facing `why-this-beer` line, which is shown instead.

### Radar axes (data-density driven)

Verified against the live catalog (Neon, 321 beers): `ibu` 99.7%, `color` 100%,
`adventurousness` 100% populated; `body` and `sweetness` only ~11%. Axes are
therefore restricted to the dense, overlay-able fields:

| Axis | Beer value (objective) | User value (overlay) |
| --- | --- | --- |
| Bitterness | normalized `ibu` | `bitterness` dial |
| Strength | normalized `abv` | `abv_affinity` dial |
| Adventurousness | `adventurousness` (already 0–1) | `novelty_affinity` dial |

- **Color** is shown as a separate gradient swatch, not a radar spoke — it is
  ordinal, not an intensity, and has no user-taste counterpart.
- **Body / sweetness** are shown as small labeled chips **only when present** for a
  beer; they are never rendered as an empty radar axis, and are **not** derived
  from style (that would present a guess as a fact). Promoting them to real radar
  spokes depends on a future catalog backfill (Out of Scope).
- Both series share one canonical axis order so the two polygons align.

### Surface: one component, two shells

- A single presentational **`BeerDetail`** component renders the objective radar,
  color swatch, conditional body/sweetness chips, `why` line, and the display
  facts (name, brewery, style, ABV, market tier). It accepts an optional overlay
  series; when absent it renders objective-only.
- On `/recommendations`, tapping a card opens `BeerDetail` inside a native
  `<dialog>` modal, fed from the recommendation data already in memory plus the
  user's cached/loaded `BaselineTaste` for the overlay. The modal is **pure client
  state** (no URL wiring); it does not fetch the beer.
- A new **`/beer/{id}`** route renders the same `BeerDetail` objective-only,
  fetching via the existing public `GET /catalog/{id}`, plus a quiz CTA. The route
  never fetches a baseline and never shows the overlay in this version.
- The recommendations Share action links to `/beer/{id}`.

### Chart: reuse and extend `TasteRadar`

`TasteRadar` (hand-rolled SVG, no dependency) is extended to accept an optional
second axis series and draw a second polygon with distinct styling (e.g. the beer
as the filled polygon, the user's taste as a dashed outline, or vice versa), with
a legend distinguishing "this beer" from "your taste." The shared `radarGeometry`
computes both polygons from the same axis order.

### Backend contract slice

The internal `BeerCandidate` (match-engine candidate) currently carries neither
`ibu`; both public contracts derive from it. The slice:

- Add `ibu` to `BeerCandidate` and to the catalog DB fetch that builds candidates.
- Add `ibu` and `adventurousness` to the `RecommendedBeer` contract + serializer.
- Add `ibu` to the `CatalogBeer` contract + serializer (`adventurousness` already
  present there).
- Regenerate the OpenAPI spec → web api-client types.

`body`/`sweetness` are **not** added to the wire in this slice — they are sparse
and only shown as chips where the recommendation/catalog payload already carries
them; if they are not on the contract yet, chips simply do not render until a
later backfill promotes them. (Confirm during execution whether the existing
payloads already expose them; if not, adding them is a trivial extension of this
same slice, gated behind the same null-safe chip rendering.)

### Overlay data source and degradation

The overlay uses the client-cached `BaselineTaste` (`readBaselineCache`) with a
react-query fetch fallback. A signed-in user viewing recommendations always has a
baseline profile (recommendations cannot exist without one), so the overlay
essentially always has data; if it is momentarily unavailable, `BeerDetail`
renders objective-only.

### No ADR, no glossary change

The feature adds display and one public route inside the existing model; it is
reversible and unsurprising, so no new ADR. It introduces no new domain term, so
`CONTEXT.md` is unchanged. `Beer` already carries "tasting attributes"; this
surfaces a subset of them.

## Testing Decisions

Good tests here assert **external behavior** — the axis values and labels a beer
produces, the fields the API returns, what renders given present/absent data —
not internal geometry math or component structure. Prior art: `taste-radar.test.ts`
(pure geometry), `session-intent.test.ts` (pure lib), `test_recommendations_route.py`
and the catalog route tests (API contract assertions), and the existing
component render tests (`GuestResults.test.tsx`, `AppNav.test.tsx`).

Modules to test (all four confirmed in scope):

1. **`beer-radar` lib (pure).** The load-bearing tests. Assert `beerSensoryAxes`
   maps representative beers to the right normalized 0–1 axis values (e.g. a high-IBU
   IPA scores high bitterness; a low-ABV lager scores low strength), that
   `tasteOverlayAxes` maps dials to the same axis order, that normalization clamps
   at the band edges, and that missing/edge inputs are handled. Mirrors
   `taste-radar.test.ts`.
2. **Backend contract fields.** Extend the recommendations route test and the
   catalog route test to assert `ibu` (and `adventurousness` on recommendations)
   are present and carry the seeded values; assert a null-`ibu` beer serializes
   without error.
3. **`BeerDetail` component.** Render tests: objective-only vs with-overlay renders
   both/one polygon; a beer with null body/sweetness omits those chips while one
   with them shows them; the `why` line and facts render; Hebrew labels resolve.
4. **`/beer/{id}` route.** A route/render test that it fetches the catalog beer,
   renders the objective view (no overlay), and shows the quiz CTA for a
   logged-out visitor; a not-found id renders a graceful empty state.

## Out of Scope

- **Catalog backfill of `body`/`sweetness`.** Promoting them from ~11% to dense,
  and thus to real radar spokes, is a separate data slice (heuristic or LLM over
  the catalog, which would also improve `BeerEmbedding`). Until then they are
  chips-when-present only.
- **Personalized overlay on the standalone `/beer/{id}` route** (even for the
  signed-in owner). A clean fast-follow; v1 keeps the route purely objective.
- **URL-addressable modal / deep-linking the modal open state.** The modal is
  client state; only `/beer/{id}` is a real URL.
- **Deriving any sensory value from style for display.** Explicitly rejected —
  would present a guess as a fact.
- **Surfacing raw `Match` breakdown scores** to users.
- **Server-rendered OG/share images** for the beer page (tracked under item 3
  follow-ups, not here).
- **A crawlable catalog *index* / richer SEO** beyond the single-beer route.

## Further Notes

- The three chosen radar axes are exactly the three catalog fields that are both
  ~100% populated and have clean `BaselineTaste` dial counterparts — the overlay
  (the differentiated part) works fully without depending on the sparse fields.
- Reusing `TasteRadar` gives visual cohesion: the user already saw this radar shape
  for their own taste profile on the home page; the detail view shows a beer inside
  the same shape, now overlaid with them.
- The `/beer/{id}` route lands the ADR-0007 deferred "crawlable public catalog
  page" as a side effect, using the endpoint that ADR already shipped.
- Slicing for `/to-issues` should follow the tracer-bullet order:
  backend contract slice → `beer-radar` lib → `BeerDetail` + `TasteRadar`
  extension (modal path) → `/beer/{id}` route + Share wiring.
