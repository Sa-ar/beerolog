# Beerolog Context

## Product

Beerolog helps a person learn their taste, get strong beer recommendations, and refine their profile over time.

## Supported MVP

- The supported runtime surface is the signed-in solo flow.
- A user can sign in, complete the quiz, get recommendations, rate beers, and keep an evolving taste profile.
- Core in-scope systems are auth, profile, recommendations, ratings/history, and persona.

## Deferred surfaces

- Venue QR, tap-list, and menu-scan flows
- Group sessions
- Friend challenges and taste comparison
- Leaderboards and social proof
- Badges and milestone systems
- Broader bar tooling and operator workflows

## Core terms

| Term | Meaning |
|---|---|
| `FlavorVector` | The 7-dimension taste model used for a user or a beer |
| `Recommendation` | A ranked beer result derived from a user's current taste profile |
| `User profile` | The persisted signed-in state for taste, history, and persona |
| `Beer history` | The beers a signed-in user has rated over time |
| `Persona` | A readable label derived from the current `FlavorVector` |

## Repo shape

- `apps/web`: TanStack Start frontend
- `apps/api`: FastAPI backend
- `packages/db`: Drizzle schema and migrations
- `packages/types`: Shared TypeScript contracts
- `packages/ui`: Shared UI components

## Workflow artifacts

- `CONTEXT.md`: shared product language and boundary
- `docs/adr/`: durable architectural and scope decisions
- `docs/prds/`: feature-level requirements and test intent
- `docs/issues/`: local vertical slices derived from an approved PRD
- `docs/ops/`: durable environment matrix, operator checklists, and release evidence records
