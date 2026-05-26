# ADR 0001: Launch-first product boundary

- Status: Accepted
- Date: 2026-05-26

## Context

Beerolog has an approved roadmap with broader venue, group, and social follow-on work, but the current workflow needs one authoritative product boundary. Without it, later PRDs and execution slices can drift back into deferred surfaces.

## Decision

- The supported MVP is the signed-in solo flow.
- In scope: auth, solo quiz and recommendations, persistent profile, ratings/history, and persona.
- Deferred: venue/scan, group sessions, friend challenges, leaderboards, social proof, badges, and broader bar tooling/operator workflows.
- PRDs and issue slices may mention deferred work only as follow-on context, not as launch requirements.

## Consequences

- Planning and implementation should default to the solo user journey.
- Shared docs should use explicit supported-versus-deferred language.
- Expanding the supported boundary should happen through a new PRD and a follow-on ADR if the product boundary changes.
