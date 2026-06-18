## Learned User Preferences

- UI icons must be custom SVGs from `@beerolog/icons` (CatalogIcon / icon factory); they must clearly represent their label—no emojis or abstract one-off shapes.
- Use a single OAuth sign-in button instead of separate sign-in and sign-up controls.
- Launch auth should be social-only (Google, Apple, Facebook, Instagram) with no email/password flow.
- Keep answers concise and to the point.
- Create small, per-feature commits that make logical sense.
- Show user-facing match % and per-card "why matched" breakdown; hide α/β tuning parameters. Match % is the session ("tonight") score and must be a real percentage, not normalized or rescaled.
- Follow the repo's 7-phase Matt Pocock skill pipeline for feature work (grill-with-docs → to-prd → to-issues → tdd).
- Home flow: inline quick selection starts a session and navigates immediately to recommendations with skeleton loading on that page; after the taste quiz, land on the main dashboard (not session-intent).
- Logged-in home should show the user's taste profile or an empty state with CTA; it should differ from the visitor landing page.
- UI should match shared card and design patterns from packages/ui.
- Remove redundant nav links when the primary flow is available on the home page.
- Use user-friendly route paths (e.g. `/recommendations`); app header is sticky and shares the same max-width container as page content; clickable controls use `cursor-pointer`.

## Learned Workspace Facts

- Beerolog is a pnpm monorepo: apps/web (TanStack Start), apps/api (FastAPI), packages/db (Drizzle), packages/types, packages/ui, packages/icons (@beerolog/icons), packages/icon-service.
- `@beerolog/icons` and `beerolog-icon-service` generate GPT SVG icons, cache them in the `icons` table by canonical purpose, and reuse on cache hit.
- Supported MVP is the signed-in solo flow: auth, menu scan, quiz, menu-scoped recommendations, ratings, and taste profile.
- Deferred surfaces include venue QR, group sessions, challenges, leaderboards, badges, and broader bar tooling.
- GitHub issues are the source of truth for planning; PRDs live in docs/prds/.
- Production domain is beerolog.com; web deploys on Vercel (beerolog.vercel.app).
- Clerk handles authentication.
- Production stack: Vercel hosts apps/web (TanStack Start SSR), Railway hosts apps/api (FastAPI), Neon Postgres is the database.
- Vercel web deploy uses Nitro `preset: 'vercel'`, root `vercel.json`, and `api/index.mjs` SSR handler wiring TanStack Start to serverless functions.
- Shared product vocabulary and MVP boundary live in CONTEXT.md; durable decisions live in docs/adr/.
- Beer catalog includes a `color` field (pale | gold | amber | brown | dark) for UI beer-color swatches.
- Catalog seed data must not persist Untappd references; beer catalog images use Vercel Blob URLs only (no third-party CDNs).
