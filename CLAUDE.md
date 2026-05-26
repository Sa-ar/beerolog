# Repository Architecture & Agent Workflow Rules
# Reference: github.com/mattpocock/skills

You are an automated software engineer. You are strictly forbidden from writing speculative features or unverified code changes. You must execute development through Matt Pocock's composable skills.

---

## 🔄 The 7-Phase Dual-Agent Pipeline

### Phase 1 & 2: /grill-with-docs (Exploration & Alignment)
Before drafting code or proposing an architecture:
- Invoke the `/grill-with-docs` skill.
- Cross-reference our concept with `CONTEXT.md` and existing architectural decisions inside `docs/adr/`.
- Interrogate the developer **one question at a time** to discover edge cases, typing boundaries, and schema requirements.

### Phase 3 & 4: /to-prd (Formalizing Strategy)
- Synthesize the finalized chat context into a Product Requirements Document via the `/to-prd` skill.
- Write this document into `docs/prds/[feature-name].md`. Stop and await confirmation.

### Phase 5: /to-issues (Vertical Slicing)
- Run `/to-issues` directly on the local PRD markdown file.
- Automatically break down the monolithic plan into a sequence of atomic, vertical slices (Schema -> API -> UI Components -> Integration Tests).
- Publish the approved slices as GitHub issues, with each issue linking back to its parent PRD.
- Print the task list and ask: *"Do you approve this slice execution plan?"*

### Phase 6 & 7: /tdd & /improve-codebase-architecture (Execution & Clean Architecture)
For each ticket in the sequence:
1. Initialize the `/tdd` skill wrapper.
2. **Red State:** Write an isolated failing test matching the feature slice requirements. Run the local test runner (`npm test`, `vitest`, etc.) and verify it fails.
3. **Green State:** Write the absolute minimum production code required to satisfy that specific test. Run the runner to verify passing status.
4. **Refactor State:** Run the `/improve-codebase-architecture` skill. Clean up abstractions, identify deep modules versus shallow interfaces, and clean up code slop before moving to the next ticket.

## Agent skills

### Issue tracker

Beerolog uses GitHub issues as the source of truth for planning work. Store PRDs in `docs/prds/<feature-slug>.md` and publish approved slices as GitHub issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Record triage category and readiness in the GitHub issue body (`Type` and `Current intended status`) unless the repo later adopts formal GitHub labels. See `docs/agents/triage-labels.md`.

### Domain docs

Beerolog is a single-context repo with shared vocabulary in `CONTEXT.md` and durable decisions in `docs/adr/`. See `docs/agents/domain.md`.
