# PRDs

PRDs capture durable feature intent before implementation starts.

## File layout

- Store one PRD per feature in `docs/prds/`
- Name files with a feature slug: `feature-name.md`
- Keep the title aligned with the feature, not a ticket number

## Required sections

- `Problem Statement`
- `Solution`
- `User Stories`
- `Implementation Decisions`
- `Testing Decisions`
- `Out of Scope`
- `Further Notes`

## Working rules

- Write the PRD before issue slicing begins
- The PRD itself does not perform slicing; once approved, publish vertical slices to GitHub Issues and link the parent PRD in each issue body
- Keep the current supported MVP boundary explicit
- Record testing intent up front, not after code exists
- Reference relevant ADRs when a feature depends on a prior decision
- Call out deferred follow-on work without treating it as part of the current slice
- Put durable operational follow-through artifacts under `docs/ops/` (`environment-matrix.md`, `checklists/`, `releases/`)
