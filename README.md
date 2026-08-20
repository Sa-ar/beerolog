# Beerolog

Take a short quiz, get beers matched to your taste profile, rate what you drink,
and watch the profile move. Live at **[beerolog.com](https://beerolog.com)**.

This is the public source of the consumer product — the taste model, the
two-stage ranker, the quiz, the menu scanner, the rating feedback loop and the
web client. Built and maintained by one engineer.

> **What is not here.** The operator side — the staff and venue portal, org and
> member management, in-venue ordering, QR flows, availability signals, the
> catalog scrape pipeline and moderation tooling — is not published. Its source
> was rewritten out of every commit rather than deleted at the tip, so no revision
> in this repository contains it; the commit *subjects* that built it are still
> in `git log`, which is why you will see messages referencing a portal whose code
> is absent. The white-label tenancy tables in `packages/db` are the exception —
> they stay, because they are part of the shipped schema and `docs/adr/0009`
> and `0010` explain why. The catalog's beer photography is third-party and not
> redistributable, so it is absent as well; the UI falls back to generated
> icons. Everything that remains builds, typechecks, and passes its tests.

## What is worth reading

- **`apps/api/app/services/match_engine.py`** — the ranker. A weighted cosine
  merge of a long-run taste embedding and a tonight's-mood embedding, a signed
  novelty re-rank, an ABV band term, and a graded avoid-penalty that down-ranks
  rather than filters.
- **`apps/api/app/services/baseline_taste.py`** — quiz answers become a synthetic
  preference sentence *and* the user-facing dials from a single source, so what
  the model scores and what the UI shows cannot drift apart.
- **`apps/api/app/services/dial_match.py`** — a second, embedding-free matcher in
  12-dimensional dial space, for the signed-out preview.
- **`apps/api/app/services/menu_scanner.py`** / **`menu_chat.py`** — photograph a bar
  menu, resolve the entries against the catalog with a fuzzy matcher, rank them
  against your profile.
- **`apps/api/tests/eval/`** — a persona harness reporting precision@5 and MRR.
  Six personas run end to end through the real composers and the real ranker.
  It is offline and deterministic — text is vectorised by a fixed projection
  into the catalog's eight axes, so it needs no key and returns the same numbers
  on every machine — and it gates CI at `P@5 >= 0.5` against a current 0.567.
  `--live` runs the same personas through `text-embedding-3-large`; two further
  probes measure Hebrew-to-English retrieval and whether hop *names* carry
  semantic signal at all.

  ```
  $ python tests/eval/run_personas.py
    hop-head-ipa-enthusiast        P@5=0.60  MRR=0.50
    mainstream-comfort-drinker     P@5=0.60  MRR=1.00
    dark-malt-fan                  P@5=0.40  MRR=1.00
    sour-and-funky-craft-nerd      P@5=0.40  MRR=1.00
    sessionable-wheat-lager-drinker P@5=0.60 MRR=1.00
    adventurous-omnivore           P@5=0.80  MRR=1.00
    AGGREGATE   P@5=0.567   MRR=0.917
  ```

  The harness is honest about its own limits: on a ten-beer catalog with
  family-level relevance, `--compare-beta` cannot yet distinguish the novelty
  re-rank from no re-rank at all. See `tests/eval/README.md`.
- **`docs/adr/`** — the architecture decisions, including the two-layer taste
  model and the auth boundary.

## Architecture

```mermaid
graph TD
  Browser([Browser])
  Vercel[Vercel — web app<br/>TanStack Start / React]
  Api[Vercel — API<br/>Python FastAPI]
  Neon[(Neon PostgreSQL)]
  Clerk[Clerk<br/>Auth]
  OpenAI[OpenAI<br/>Recommendation explanations]

  Browser --> Vercel
  Vercel --> Api
  Api --> Neon
  Vercel --> Clerk
  Api --> Clerk
  Api --> OpenAI
```

## Monorepo layout

| Directory | Purpose |
|---|---|
| `apps/web` | TanStack Start (React + Vinxi) frontend, deployed on Vercel |
| `apps/api` | FastAPI backend, deployed on Vercel (separate `beerolog-api` project) |
| `packages/types` | Shared TypeScript types and FlavorVector contract |
| `packages/db` | Drizzle ORM schema + migrations (Neon PostgreSQL) |
| `packages/ui` | Shared React component library |

## Prerequisites

- **Node** 20+
- **pnpm** 11+ (`npm i -g pnpm`)
- **Python** 3.12+

## Quick start

```bash
# 1. Install JS dependencies
pnpm install

# 2. Configure the API
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env and fill in the required values for DB, OpenAI, Clerk, and CORS

# 3. Configure the web app
cp apps/web/.env.local.example apps/web/.env.local
# Edit apps/web/.env.local — set VITE_API_URL=http://localhost:8000 for local dev

# 4. Set up the API Python environment
cd apps/api
uv sync --extra dev
cd ../..

# 5. Run migrations
pnpm db:migrate   # provisions the supported MVP persistence tables

# 6. Start everything
pnpm dev          # web app (http://localhost:3000)
# In a separate terminal:
cd apps/api && uv run uvicorn app.main:app --reload
```

## Verification

```bash
pnpm typecheck   # tsc --noEmit across every workspace package
pnpm lint        # eslint (web/packages) + ruff check & format (api)
pnpm test        # API pytest, web vitest + axe, and the OpenAPI contract check
pnpm test:eval   # persona harness, the ranking-quality regression gate
```

`pnpm test`'s contract step regenerates `apps/api/openapi.json` and the typed
client in `apps/web/src/lib/api-client/` and fails if either drifts from what is
committed — a drifted client is a silent production break, so it is treated as a
test failure rather than a formatting nit.

## Scope

- The supported journey is the signed-in solo flow: sign in, take the quiz, scan
  a bar menu or browse the catalog, get ranked recommendations, rate what you
  drank, watch the profile move.
- The authoritative recommendation path is the API's `/recommendations`.
- Deliberately out of scope: group sessions, friend challenges, leaderboards and
  social proof, badges, and operator/venue tooling. `CONTEXT.md` records why, and
  `docs/adr/0001-launch-first-product-boundary.md` is the decision itself.
- Runtime configuration is environment-driven — `APP_ENV`,
  `CORS_ALLOWED_ORIGINS`, `LOG_LEVEL`; the full matrix is in
  `docs/ops/environment-matrix.md`.

## Further reading

- [API setup](apps/api/README.md)
- [Web app setup](apps/web/README.md)
- [Architecture](docs/architecture.md)
- [Architecture decision records](docs/adr/)
- [Contributor guide](AGENTS.md) · [shared primitives](docs/contributing/primitives.md) · [frontend conventions](docs/contributing/frontend-conventions.md)
- [Operational artifacts](docs/ops/README.md)
- [Clerk (authentication)](docs/services/clerk.md)
- [Neon PostgreSQL](docs/services/neon.md)
- [OpenAI](docs/services/openai.md)
- [Vercel (API deployment)](docs/services/vercel-api.md)
- [Vercel (web deployment)](docs/services/vercel.md)


## License

MIT — see [LICENSE](LICENSE). The license covers the source in this repository.
Beer, brewery and venue names appearing in fixtures and tests belong to their
respective owners.
