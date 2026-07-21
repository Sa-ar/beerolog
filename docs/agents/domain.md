# Domain Docs

How Beerolog's engineering skills should consume repo context before planning or implementation work.

## Read these first

- Root [`AGENTS.md`](../../AGENTS.md) for pipeline, docs map, and learned memory
- `CONTEXT.md` for shared product language, MVP scope, and repo shape
- [`primitives.md`](./primitives.md) before inventing UI, fetch, or util one-offs
- `docs/adr/` for durable product and architectural decisions
- `docs/prds/README.md` and `docs/issues/README.md` when working on planning artifacts

## Repo layout

Beerolog is a single-context repo. Use the root-level docs as the source of truth:

```text
/
├── CONTEXT.md
├── docs/
│   ├── adr/
│   ├── prds/
│   ├── issues/
│   └── ops/
└── apps/ packages/
```

## Vocabulary discipline

Use the terms from `CONTEXT.md` when naming PRDs, slices, implementation modules, and tests. Prefer the repo's established terms such as `FlavorVector`, `Recommendation`, `User profile`, `Beer history`, and `Persona`.

If a needed concept is missing from `CONTEXT.md`, note the gap and surface it during `/grill-with-docs` instead of inventing a competing term silently.

## ADR conflicts

If proposed work contradicts an ADR, call that out explicitly instead of silently overriding prior decisions.
