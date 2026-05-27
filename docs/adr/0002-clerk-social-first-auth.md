# ADR 0002: Clerk social-first authentication

- Status: Accepted
- Date: 2026-05-27

## Context

Beerolog’s supported MVP is the signed-in solo flow (ADR 0001). The repo currently assumes AWS Cognito Hosted UI as the authentication provider and bakes that choice into documentation, environment contracts, and identity assumptions (for example, “user id = Cognito `sub`”).

For launch, Beerolog wants a **social-first** sign-in experience with these requirements:

- Supported sign-in methods: Google, Apple, Facebook, Instagram
- No email/password login and no “local account” UX as part of the supported MVP
- Separate sign-in affordances for Facebook and Instagram

Those requirements make authentication a product-facing surface, not just infrastructure. The existing Cognito-first plan is no longer the best fit for the desired provider breadth and UX.

## Decision

- Beerolog will use **Clerk** as the authentication provider for the supported MVP.
- Beerolog’s supported launch auth surface is **social-only**: Google, Apple, Facebook, Instagram.
- Beerolog will treat provider setup as a production readiness requirement (OAuth providers still require production credential setup regardless of auth platform).
- Beerolog will align web and API auth around a single contract:
  - Web obtains a session token from Clerk and sends it as a bearer token to the API.
  - API validates Clerk-issued tokens and derives a stable `user_id` used for persistence.
- Beerolog’s canonical persisted user identifier for launch is the **Clerk user id** (not Cognito `sub`).
  - If Beerolog later adds account-linking or multiple auth identities per user, it will introduce an internal user id plus a separate identity mapping model via a follow-on ADR/PRD.

## Consequences

- Cognito becomes a historical reference, not the active launch auth provider.
- Documentation that hard-codes Cognito must be updated to reference Clerk and the social-only provider set.
- Auth/session work should focus on a stable Clerk-backed contract (web, API verification, env matrix, operator verification), rather than hardening Cognito-specific flows.
- Persisted user identity assumptions must shift from “Cognito `sub`” to “Clerk user id” in architecture docs and persistence PRDs.

