## Learned User Preferences

- UI icons must be custom SVGs from `@beerolog/icons` (CatalogIcon / icon factory); they must clearly represent their label—no emojis or abstract one-off shapes.
- Launch auth with a single OAuth button; social-only (Google, Apple, Facebook, Instagram) with no email/password flow.
- Keep answers concise and to the point.
- Create small, per-feature commits that make logical sense.
- Show user-facing match % and per-card why-lines (LLM: fast, short, accurate, in the user's locale); hide α/β tuning parameters. Match % is the session ("tonight") score and must be a real percentage, not normalized or rescaled. Why-line copy must not repeat style already shown in pills—put the match explanation in the why text only.
- Follow the repo's 7-phase Matt Pocock skill pipeline for feature work (grill-with-docs → to-prd → to-issues → tdd).
- Home flow: inline quick selection starts a session and navigates immediately to recommendations with skeleton loading on that page; after the taste quiz, land on the main dashboard (not session-intent). Logged-in home should show the user's taste profile or an empty state with CTA and differ from the visitor landing page; taste-profile details stay an always-open section (not a collapsible details). Remove redundant nav links when the primary flow is available on the home page. Quiz habit proxies (e.g. coffee) stay single-choice with "pick your usual" framing when they feel multi-select.
- UI should match shared card and design patterns from packages/ui; beer images on cards and search results should be larger and fill card height on desktop.
- Hebrew UI copy should read as natural Israeli Hebrew—avoid calques, inconsistent singular/plural register, and tech loanwords (e.g. אווירת הערב not מצב הרוח; consistent שלכם throughout).
- Marketing copy must present Beerolog as always free for users, not a free trial.
- Signed-out marketing surfaces (landing, sign-in, age gate, header/footer shell) must be mobile-friendly and fully responsive across breakpoints—not a mobile-only layout on desktop.
- Layout: user-friendly route paths; sticky header and main content share `PAGE_SHELL` width (`apps/web/src/lib/page-shell.ts`); footer language switcher stays in a fixed physical position (`dir="ltr"` on the switcher); scrollbars only when content overflows; clickable controls use `cursor-pointer`. Signed-in chrome: desktop uses sidebar-only nav (logo at top, user menu at bottom)—no double top+side nav and no separate Account link outside UserMenu; mobile keeps top logo + user menu. Keep menu scan discoverable as a primary feature.

## Learned Workspace Facts

- Beerolog is a pnpm monorepo: apps/web (TanStack Start), apps/api (FastAPI), packages/db (Drizzle), packages/types, packages/ui, packages/icons (@beerolog/icons), packages/icon-service.
- `@beerolog/icons` and `beerolog-icon-service` generate GPT SVG icons, cache them in the `icons` table by canonical purpose, and reuse on cache hit.
- Supported MVP is the signed-in solo flow: auth, menu scan, quiz, menu-scoped recommendations, ratings, and taste profile.
- Deferred surfaces include venue QR, group sessions, challenges, leaderboards, badges, and broader bar tooling. Recommendations "find nearby" search UI is gated by `VITE_FEATURE_FIND_NEARBY_SEARCH` (`features.findNearbySearch`) until places are ready; place entry is still desired, venue list TBD.
- GitHub issues are the source of truth for planning; PRDs live in docs/prds/.
- Production stack: Vercel hosts apps/web (`beerolog`, TanStack Start SSR) and apps/api (`beerolog-api`, FastAPI via uv); Neon Postgres is the database; Clerk handles authentication. Domains: beerolog.com / api.beerolog.com (defaults beerolog.vercel.app / beerolog-api.vercel.app). Web mounts Vercel Analytics in the root layout; PostHog is planned but not implemented.
- Vercel web deploy uses Nitro `preset: 'vercel'`, root `vercel.json`, and `api/index.mjs` SSR handler; API deploy uses `apps/api/vercel.json`, monorepo-root install for `packages/icon-service`, and `apps/api/api/index.py`. Public `POST /guest-recommendations` is rate-limited per IP via a dashboard-published Vercel WAF rule (documented in `docs/services/vercel-api.md` and ADR 0004), not auto-applied from the repo.
- Shared product vocabulary and MVP boundary live in CONTEXT.md; durable decisions live in docs/adr/.
- Age gate blocks first visit until simple 18+ confirmation; uses `age_verified` cookie (Israel drinking age 18; Beerolog does not sell alcohol).
- Compliance program PRD: `docs/prds/compliance-privacy-and-accessibility.md` (GDPR, Israeli privacy law, SI 5568 / WCAG 2.0 AA).
- Beer catalog includes a `color` field (pale | gold | amber | brown | dark) for UI beer-color swatches; catalog seed data must not persist Untappd references and uses Vercel Blob URLs only (no third-party CDNs).
- Recommendation why-lines: one batched `gpt-4o-mini` call per recommendations request, grounded on structured match facts, in client locale (`en` | `he`); on timeout/failure the API falls back to deterministic template codes.
