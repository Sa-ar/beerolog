# Operational artifacts

`docs/ops/` is the canonical home for durable operational artifacts required by Beerolog PRDs and launch workflows.

## Layout

- `environment-matrix.md`: authoritative environment matrix for web, API, and provider configuration
- `checklists/`: operator-facing runbooks and repeatable verification checklists
- `releases/`: release evidence records for specific launch candidates or deployments

## Working rules

- Store variable names, ownership, and configuration locations here, but never commit live secret values
- Keep checklists focused on repeatable operator actions, not feature requirements
- Treat release evidence as append-only records of what was actually verified
- Link back to the PRD or ADR that required the artifact when helpful
