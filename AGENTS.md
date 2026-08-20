# Beerolog — Contributor Guide

Canonical working instructions for this repo, for humans and coding agents alike.
`CLAUDE.md` and `.cursorrules` only point here.

---

## Orientation

| Topic | Doc |
|-------|-----|
| What the product is, and the MVP boundary | [`CONTEXT.md`](CONTEXT.md) |
| Durable architectural decisions | [`docs/adr/`](docs/adr/) |
| Feature-level requirements | [`docs/prds/`](docs/prds/) |
| System architecture | [`docs/architecture.md`](docs/architecture.md) |
| Shared primitives (UI, icons, types, connection helpers, hooks, utils) | [`docs/contributing/primitives.md`](docs/contributing/primitives.md) |
| Frontend coding conventions | [`docs/contributing/frontend-conventions.md`](docs/contributing/frontend-conventions.md) |
| Visual identity | [`docs/design-guide.md`](docs/design-guide.md) |
| Environment matrix, deploy checklists, incidents | [`docs/ops/`](docs/ops/) |
| External service configuration | [`docs/services/`](docs/services/) |

---

## Commands

```bash
pnpm install                       # install JS workspace deps
pnpm dev                           # web app on :3000
pnpm typecheck                     # tsc --noEmit across the workspace
pnpm lint                          # eslint + ruff
pnpm --dir apps/web test           # vitest unit + axe accessibility tests

cd apps/api
uv sync --extra dev
uv run pytest tests/ -q            # API test suite
uv run uvicorn app.main:app --reload
uv run python tests/eval/run_personas.py   # offline ranking-quality harness
```

CI (`.github/workflows/ci.yml`) runs typecheck, both linters, both test suites,
a real production build, a Drizzle migration drift check, and the persona
harness with a `P@5 >= 0.5` floor. Everything above must pass locally first.

---

## How work gets done

1. **Establish the boundary before writing code.** Cross-reference the change
   against `CONTEXT.md` and the existing decisions in `docs/adr/`. If a change
   moves the product boundary, changes system shape, or reverses an earlier
   decision, it needs an ADR — write it, don't override silently.
2. **Write the PRD for anything non-trivial.** `docs/prds/<feature-slug>.md`,
   with concrete acceptance criteria. GitHub Issues carry the execution slices
   and link back to the parent PRD.
3. **Slice vertically.** Schema → API → UI → integration test. One slice should
   be independently shippable.
4. **Test-first.** Write the failing test, watch it fail, write the minimum code
   to pass, then refactor. Ranking changes must also be run through the persona
   harness — it is the regression gate on recommendation quality.

No speculative features, and no unverified changes: if it isn't exercised by a
test or run against the real app, it isn't done.

---

## Non-negotiable reuse rule

Prefer existing **primitives** over local one-offs. That covers `@beerolog/ui`
components, `@beerolog/icons`, `@beerolog/types`, the connection helpers and
react-query hooks in `apps/web/src/lib`, and shared utils — not only buttons and
headings. Some of this is lint-enforced: raw `<h1>`–`<h6>` and native `<dialog>`
under `apps/web/src` are CI errors.

See [`docs/contributing/primitives.md`](docs/contributing/primitives.md).

---

## Product conventions worth knowing

- **Icons** are custom SVGs from `@beerolog/icons` and must clearly depict their
  label — no emoji, no abstract one-off shapes.
- **Auth** is social-only (Google, Apple, Facebook, Instagram) through a single
  OAuth entry point. There is no email/password flow.
- **Match %** shown on a card is the session ("tonight") score and must be a real
  percentage — never normalised or rescaled for presentation. The α/β tuning
  parameters stay internal.
- **Why-lines** are per-beer and unique; they explain the match and must not
  repeat information already shown in the style pills.
- **Hebrew copy** must read as natural Israeli Hebrew — no calques, consistent
  register, no unnecessary tech loanwords.
- **Commits** are small and per-feature, each one a logically complete change.
