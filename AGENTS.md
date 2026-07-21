# Beerolog — Agent Guide

Canonical instructions for every coding agent (Cursor, Claude Code, Codex, etc.).
Tool-specific stubs (`CLAUDE.md`, `.cursorrules`) only point here.

You are an automated software engineer. Do not write speculative features or
unverified code changes. Execute feature work through Matt Pocock's composable
skills ([reference](https://github.com/mattpocock/skills)).

---

## 7-Phase Dual-Agent Pipeline

### Phase 1 & 2: /grill-with-docs (Exploration & Alignment)

Before drafting code or proposing an architecture:

- Invoke the `/grill-with-docs` skill.
- Cross-reference the concept with `CONTEXT.md` and existing decisions in `docs/adr/`.
- Interrogate the developer **one question at a time** to discover edge cases,
  typing boundaries, and schema requirements.

### Phase 3 & 4: /to-prd (Formalizing Strategy)

- Synthesize the finalized chat context into a Product Requirements Document via
  the `/to-prd` skill.
- Write it to `docs/prds/[feature-name].md`. Stop and await confirmation.

### Phase 5: /to-issues (Vertical Slicing)

- Run `/to-issues` on the local PRD markdown file.
- Break the plan into atomic vertical slices (Schema → API → UI → Integration Tests).
- Publish approved slices as GitHub issues, each linking back to its parent PRD.
- Print the task list and ask: *"Do you approve this slice execution plan?"*

### Phase 6 & 7: /tdd & /improve-codebase-architecture

For each ticket in sequence:

1. Initialize the `/tdd` skill wrapper.
2. **Red:** write an isolated failing test; run the local runner and verify failure.
3. **Green:** write the minimum production code to pass; verify.
4. **Refactor:** run `/improve-codebase-architecture` before the next ticket.

---

## Agent docs map

| Topic | Doc |
|-------|-----|
| Shared primitives (UI, icons, types, API/connection helpers, hooks, utils) — use, create, when | [`docs/agents/primitives.md`](docs/agents/primitives.md) |
| Frontend coding conventions (enums, nesting, debounced search) | [`docs/agents/frontend-conventions.md`](docs/agents/frontend-conventions.md) |
| Domain vocabulary & ADR discipline | [`docs/agents/domain.md`](docs/agents/domain.md) |
| GitHub issues / PRDs | [`docs/agents/issue-tracker.md`](docs/agents/issue-tracker.md) |
| Triage fields on issues | [`docs/agents/triage-labels.md`](docs/agents/triage-labels.md) |
| Product language & MVP boundary | [`CONTEXT.md`](CONTEXT.md) |
| Durable decisions | [`docs/adr/`](docs/adr/) |
| Visual identity | [`docs/design-guide.md`](docs/design-guide.md) |

### Non-negotiable reuse rule

Prefer existing **primitives** over local one-offs. That includes `@beerolog/ui`
components, `@beerolog/icons`, `@beerolog/types`, `apps/web/src/lib` connection
functions / react-query hooks, and shared utils — not only buttons and headings.
See [`docs/agents/primitives.md`](docs/agents/primitives.md).

---

## Learned User Preferences

- UI icons must be custom SVGs from `@beerolog/icons` (CatalogIcon / icon factory); they must clearly represent their label—no emojis or abstract one-off shapes.
- Launch auth with a single OAuth button; social-only (Google, Apple, Facebook, Instagram) with no email/password flow.
- Keep answers concise and to the point.
- Create small, per-feature commits that make logical sense.
- Show user-facing match % and per-card why-lines (LLM: fast, short, accurate, in the user's locale); each beer needs a unique reason—do not show identical shared fact bullets as the primary why. Hide α/β tuning parameters. Match % is the session ("tonight") score and must be a real percentage, not normalized or rescaled. Why-line copy must not repeat style already shown in pills—put the match explanation in the why text only.
- Follow the repo's 7-phase Matt Pocock skill pipeline for feature work (grill-with-docs → to-prd → to-issues → tdd).
- Home flow: inline quick selection starts a session and navigates immediately to recommendations with skeleton loading on that page; after the taste quiz, land on the main dashboard (not session-intent). Logged-in home should show the user's taste profile or an empty state with CTA and differ from the visitor landing page; taste-profile details stay an always-open section (not a collapsible details). Remove redundant nav links when the primary flow is available on the home page. Quiz habit proxies (e.g. coffee) stay single-choice with "pick your usual" framing when they feel multi-select.
- Prefer shared primitives (UI, icons, types, connection helpers, hooks, utils — see `docs/agents/primitives.md`) over raw HTML or ad-hoc fetch/copy-paste; beer images on cards and search results should be larger and fill card height on desktop.
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
- Recommendation why-lines: one batched `gpt-4o-mini` call per recommendations request, grounded on structured match facts, in client locale (`en` | `he`); cards should prefer unique per-beer LLM `why.text`, with deterministic templates/facts as fallback—not identical primary copy across cards.
