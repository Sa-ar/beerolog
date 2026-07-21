# Frontend Conventions

Web conventions distilled from PR review feedback. Follow these when writing or
changing code under `apps/web` and `packages/ui`.

**Shared building blocks** (UI, icons, types, API/connection helpers, hooks,
utils — what they are, how to use them, when/how to create new ones) live in
[`primitives.md`](./primitives.md). This file covers coding style that is not
"which export to import."

## Enum-like values: `const` object, derived type

Model a fixed set of string values as a `const` object and derive the union type
from it. Reference the members (`RATINGS.unknown`, `RATE_MODE.deck`) instead of
scattering bare string literals or a hand-written union.

```ts
export const RATINGS = { loved: 'loved', fine: 'fine', disliked: 'disliked', unknown: 'unknown' } as const
export type Rating = (typeof RATINGS)[keyof typeof RATINGS]
```

Shared vocabularies live in `@beerolog/types`; component-local ones (e.g. a UI
mode toggle) can sit next to the component. Keep them mirrored with any API-side
source of truth (e.g. `apps/api/app/ratings_vocab.py`).

## No component functions defined inside components

Don't define a `renderX()` helper that returns JSX, or a component, inside
another component. Extract it to a top-level component in the same file. This
keeps state branching readable and avoids identity churn on every render.

```tsx
// no: nested renderResults() returning JSX
// yes: top-level <SearchResults /> + <SearchResult /> components
```

Top-level helper components may use early returns for state branching, which also
sidesteps the `no-nested-ternary` lint rule.

## Debounced input feeds react-query, not a manual effect

For debounced search, use the reusable `useDebouncedValue` hook
(`apps/web/src/lib/use-debounced-value.ts`) and feed its result into the query
key. Don't hand-wire a `useEffect` + second `useState` in the component. Server
state stays in react-query (see the react-query-over-`useEffect`-fetch rule).

```tsx
const debounced = useDebouncedValue(query.trim(), 250)
const results = useBeerSearch(debounced) // enabled at >= 2 chars
```

See [`primitives.md`](./primitives.md) for the broader connection-helper and
hook catalog this pattern belongs to.
