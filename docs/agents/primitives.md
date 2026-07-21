# Shared Primitives

Beerolog prefers **reuse over reinvention**. A "primitive" is any shared building
block agents and humans should reach for before writing local one-offs — not only
UI components.

## What counts as a primitive

| Layer | Lives in | Examples |
|-------|----------|----------|
| UI components | `@beerolog/ui` (`packages/ui`) | `Button`, `Heading`, `Dialog`, `Card`, `Badge`, `Alert`, `Text`, `RatingTapper`, `ProgressRing`, `cn` |
| Icons | `@beerolog/icons` (`packages/icons`) | `CatalogIcon`, icon factory / purpose-keyed SVGs |
| Domain types & vocab | `@beerolog/types` (`packages/types`) | `RATINGS`, `FlavorVector`, `BeerStyle`, personas |
| API connection | `apps/web/src/lib/api-*`, feature `*-fetch` modules | `apiClient`, `apiFetch`, `getAuthToken`, `fetchAvailability`, `startSession`, `loadMoreRecommendations`, `fetchGuestRecommendations` |
| Server-state hooks | `apps/web/src/lib/*.ts` (react-query wrappers) | `useBeerSearch`, `useMyRatings`, `useRateDeck`, `useScanMenu`, `useMenuRank`, `getQueryClient` |
| Layout / chrome tokens | `apps/web/src/lib/page-shell.ts`, `signed-in-nav.ts` | `PAGE_SHELL`, `PAGE_MAIN`, `SIGNED_IN_NAV` |
| Cross-cutting utils | `apps/web/src/lib/` | `useDebouncedValue`, `formatApiError`, `tonightMatchPercent`, `deriveBeerColor`, `features` |
| Visual identity | `docs/design-guide.md` + CSS tokens | palette, type recipes (not code, but binding) |

Feature screens compose these. They do **not** reimplement the same button,
heading, fetch wrapper, or enum locally.

## How to use an existing primitive

1. **Search first** — check `@beerolog/ui` / `@beerolog/icons` / `@beerolog/types`
   exports and `apps/web/src/lib/` for a connection helper or hook that already
   does the job.
2. **Import the shared export** — don't copy its internals into the feature file.
3. **Adapt via props / `className` / `variant`** — unusual layout (e.g. image-as-
   button lightbox) still uses `Button` + `Dialog`; override styling, don't skip
   the primitive.
4. **Keep domain vocab shared** — rating strings, vibes, etc. come from
   `@beerolog/types` or mirrored API vocab, not ad-hoc string unions in the UI.
5. **Keep server I/O in lib modules** — screens call `startSession` /
   `apiClient.GET` wrappers; they don't invent a second `fetch` stack.

### UI quick map

| Need | Use | Avoid |
|------|-----|-------|
| Headings | `Heading` (`level`) | inline `<h1>`–`<h6>` + type Tailwind |
| Buttons / tappable controls | `Button` | raw `<button>` (except inside a primitive) |
| Modals / lightboxes | `Dialog`, `DialogContent`, `DialogTitle`, `DialogDescription` | native `<dialog>`, ad-hoc overlays, lightbox libs |
| Surfaces / labels / alerts / body | `Card`, `Badge`, `Alert`, `Text` | one-off wrappers with the same look |
| Icons | `@beerolog/icons` | emoji or one-off abstract SVGs |

Reference implementations: `AgeVerificationGate` (Dialog + Button),
`BeerCardMedia` (Dialog lightbox), recommendations route (`Heading` + `Button`).

### Connection / data quick map

| Need | Use | Avoid |
|------|-----|-------|
| Authenticated HTTP | `apiFetch` / `apiClient` + `getAuthToken` | bare `fetch` to the API |
| Recommendations session | `startSession`, `loadMoreRecommendations`, `session-intent` storage helpers | duplicating payload / storage keys |
| Availability | `fetchAvailability`, `reportAvailability`, `addAvailability` | inline POST shapes in components |
| Debounced search | `useDebouncedValue` + react-query hook (`useBeerSearch`) | `useEffect` + manual timers |
| Page width / safe areas | `PAGE_SHELL` / `PAGE_MAIN` | hard-coded max-width padding per route |

## When to create a new primitive

Create one when **at least one** is true:

- The same UI control or fetch/mapping pattern already appears (or is about to
  appear) in **two or more** screens.
- Review feedback keeps rejecting local raw markup / ad-hoc fetch for the same
  job (signals a missing shared piece).
- The behavior encodes product rules (auth header, ratings vocab, match %, page
  shell) that must stay consistent across the app.
- You're tempted to copy-paste a non-trivial helper (>~15 lines) into a second
  file.

Do **not** create a new primitive when:

- It's a one-off layout for a single screen with no reuse path.
- It's a thin alias that only renames an existing export.
- It's speculative ("we might need this later") with no second caller.
- It belongs in a feature component (e.g. `RecommendationBeerCard`) rather than
  a design-system or shared-lib layer.

When unsure: ship the local version once, then promote on the second use.

## How to create a new primitive

### UI (`packages/ui`)

1. Add `packages/ui/src/components/<name>.tsx` (or extend an existing file if it
   is a tight variant of one control).
2. Build on existing primitives (`Button`, `cn`, tokens) — don't reintroduce raw
   conflicting patterns inside the new one.
3. Export from `packages/ui/src/index.ts`.
4. Prefer `variant` / size APIs (cva) over one-off boolean props when styles fork.
5. Add a short usage note to this doc's tables if the primitive is broadly useful.
6. Consume it from `apps/web` immediately (no orphan exports).

### Icons (`packages/icons`)

1. Add via the catalog / icon factory with a **canonical purpose** key so cache
   reuse works.
2. Export through `@beerolog/icons`; never inline emoji as a permanent control
   affordance.

### Domain types (`packages/types`)

1. Prefer `const` object + derived type (see frontend conventions).
2. Mirror any API-side vocab (e.g. `apps/api/app/ratings_vocab.py`).
3. Export from `packages/types/src/index.ts`.

### Connection functions & hooks (`apps/web/src/lib`)

1. Put HTTP + DTO mapping in a named module (`beer-availability.ts`,
   `session-intent.ts`, …) — not inside route components.
2. Wrap server state in react-query hooks when the UI needs cache/invalidation
   (`useBeerSearch`, `useMyRatings`).
3. Reuse `apiFetch` / `apiClient` for auth and base URL; don't open a parallel
   client.
4. Export only stable helpers the UI needs; keep transport details private to the
   module.
5. Colocate a unit test next to non-trivial mapping/branching.

### Layout / utils

1. Shared layout tokens go in `page-shell.ts` (or a similarly boring module).
2. Generic hooks (`useDebouncedValue`) stay dependency-free of feature DTOs.
3. Feature-specific pure helpers can live next to the feature until a second
   caller appears — then promote.

## Checklist before merging UI or data plumbing

- [ ] No new raw `<button>` / `<h1>`–`<h6>` / `<dialog>` where a UI primitive exists
- [ ] No new bare `fetch` to the Beerolog API where `apiFetch` / a lib helper exists
- [ ] No new string-literal rating/vibe unions where `@beerolog/types` (or API vocab) exists
- [ ] New shared pieces are exported from the right package/module and used by the caller that justified them
