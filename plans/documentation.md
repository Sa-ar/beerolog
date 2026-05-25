# Plan: Project Documentation

> Source PRD: [#17 — README, architecture, service configuration](https://github.com/Sa-ar/beerolog/issues/17)

## Architectural decisions

- **Doc structure**: Root `README.md` for orientation; `apps/api/README.md` and `apps/web/README.md` for app-level setup; `docs/` for deep topics
- **Service config docs**: One file per external service under `docs/services/`
- **Env var format**: Consistent table — variable name | required | default | description — across all docs
- **Diagrams**: Mermaid `graph TD` in root README; renders natively on GitHub, no external tool needed
- **Audience**: Solo developer; docs are dense references, not tutorials — favor exact commands and values over explanation
- **`.env.example` files**: Created for both `apps/api` and `apps/web` so local setup is a single `cp` step

---

## Phase 1: Root README + `.env.example` files

**User stories**: 1, 2, 3, 4, 5, 6, 19, 23

### What to build

The root `README.md` is the entry point to the entire project. It should let you orient yourself in under 2 minutes and be running locally in under 10. Write it with a Mermaid `graph TD` diagram showing: Browser → Vercel (web) → Railway (API) → Neon (DB), plus API → Cognito and API → OpenAI. Include a monorepo layout table (`apps/web`, `apps/api`, `packages/types`, `packages/db`, `packages/ui`), prerequisites list, the minimal quick-start command sequence, and links to every other doc file.

Also create `.env.example` for both apps — the API file covers all 6 settings from `config.py`; the web file covers the 3 `VITE_*` variables.

### Acceptance criteria

- [ ] Root `README.md` exists with project title + one-line description
- [ ] Mermaid diagram renders on GitHub and shows all five services (Browser, Vercel, Railway, Neon, Cognito, OpenAI)
- [ ] Monorepo layout table lists all five workspace directories with a one-line purpose
- [ ] Prerequisites section lists Node 20+, pnpm 11+, Python 3.12+
- [ ] Quick-start section covers: clone, `pnpm install`, `cp .env.example`, fill vars, `pnpm dev` / API dev server
- [ ] Links section points to `apps/api/README.md`, `apps/web/README.md`, `docs/architecture.md`, and each `docs/services/*.md`
- [ ] `apps/api/.env.example` exists with all 6 API env vars and inline comments
- [ ] `apps/web/.env.local.example` exists with all 3 `VITE_*` vars and inline comments

---

## Phase 2: Per-app READMEs

**User stories**: 17, 18

### What to build

`apps/api/README.md` covers everything needed to run the Python API from scratch: Python version, creating the venv, installing deps, running the dev server with uvicorn, running the full test suite with pytest. Includes the complete env var table (name, required, default, description) for all 6 settings. Calls out prominently that `API_SECRET` must be overridden in production.

`apps/web/README.md` covers the web app: Node version, `pnpm install`, dev server command, typecheck command, how to point at the local API via `VITE_API_URL`, and a pointer to `docs/services/vercel.md` for deployment.

### Acceptance criteria

- [ ] `apps/api/README.md` lists Python 3.12 requirement and venv setup commands
- [ ] `apps/api/README.md` includes env var table with all 6 variables (name, required, default, description)
- [ ] `apps/api/README.md` has a prominent warning that `API_SECRET=dev-secret` must be changed in prod
- [ ] `apps/api/README.md` covers `uvicorn app.main:app --reload` and `pytest` commands
- [ ] `apps/web/README.md` covers `pnpm install`, `pnpm dev`, `pnpm typecheck`
- [ ] `apps/web/README.md` includes env var table for the 3 `VITE_*` variables
- [ ] `apps/web/README.md` explains how to set `VITE_API_URL=http://localhost:8000` for local dev

---

## Phase 3: Architecture doc

**User stories**: 7, 8, 9, 20, 21, 22

### What to build

`docs/architecture.md` is the deep-reference doc. It explains:

- **FlavorVector contract**: 7 dimensions in canonical order, `[0, 1]` range, schema version, and the breaking-change policy (any add/remove/reorder requires bumping `FLAVOR_VECTOR_SCHEMA_VERSION` and running a re-embedding migration)
- **Service modules**: each module in `apps/api/app/services/` and its responsibility (recommendation, feedback nudge, persona classification, group session aggregation, leaderboard, social proof, badge engine, menu scanner, QR token, challenge)
- **In-memory repo pattern**: every service has a `Protocol` + `InMemory*Repo`; production repos are injected via FastAPI `dependency_overrides`; tests never hit a real DB
- **DB schema overview**: one paragraph per table (`users`, `user_profiles`, `beers`, `venues`, `venue_tap_list`, `beer_ratings`, `group_sessions`, `group_participants`, `friendships`) explaining what it stores and key columns
- **pgvector**: HNSW index on `embedding` in `user_profiles` and `beers`; used for similarity search
- **Key flows**: QR scan (generate token → encode venue ID → decode on scan → return tap list), group session (create → join → submit vector → aggregate → recommend), taste feedback nudge (rate beer → nudge flavor vector toward/away), persona classification (cosine similarity to 10 centroids)

### Acceptance criteria

- [ ] `docs/architecture.md` exists and has a top-level section for FlavorVector
- [ ] FlavorVector section lists all 7 dimensions with range, canonical order, and version policy
- [ ] Service modules section covers all services with one-sentence responsibility each
- [ ] In-memory repo pattern is explained with enough detail to understand the test isolation strategy
- [ ] DB schema section covers all 9 tables
- [ ] Each of the 4 key flows is described end-to-end in prose

---

## Phase 4: Service configuration guides

**User stories**: 10, 11, 12, 13, 14, 15, 16

### What to build

Five files under `docs/services/`, one per external service. Each is a dense step-by-step reference — what to create, what to note down, which env var it produces, and where to set it.

- **`cognito.md`**: Create user pool (hosted UI, email sign-in), create app client (implicit grant, callback URL `{origin}/auth/callback`), note `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`; which vars go on API vs web
- **`neon.md`**: Create project, enable pgvector extension, copy connection string into `DATABASE_URL`, run `pnpm db:generate && pnpm db:migrate`, when to re-run migrations
- **`openai.md`**: Create API key, set `OPENAI_API_KEY`; which models are used (text-embedding-3-small for embeddings, GPT-4o for menu scanning and explanations)
- **`railway.md`**: Create service from GitHub repo, set root directory to `apps/api`, set start command, all 6 env vars to set in the Railway dashboard, health check path (`/health`), `API_SECRET` warning
- **`vercel.md`**: Create project from GitHub repo, set root directory to `apps/web`, framework preset (other / Vinxi), build command, all 3 `VITE_*` env vars to set in the Vercel dashboard

### Acceptance criteria

- [ ] `docs/services/cognito.md` exists with user pool creation steps and callback URL configuration
- [ ] `docs/services/cognito.md` specifies which env vars go on API vs web
- [ ] `docs/services/neon.md` covers pgvector enablement and migration commands
- [ ] `docs/services/openai.md` names both models used and the env var
- [ ] `docs/services/railway.md` lists all 6 API env vars and calls out `API_SECRET` as security-critical
- [ ] `docs/services/railway.md` includes the health check path
- [ ] `docs/services/vercel.md` lists all 3 web env vars and the build configuration
