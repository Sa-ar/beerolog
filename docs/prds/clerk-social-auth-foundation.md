# PRD: Clerk Social-First Auth Foundation

## Problem Statement

Beerolog's supported MVP is the signed-in solo flow, which means launch readiness depends on authentication being reliable, easy to enter, and genuinely frictionless for the target audience. The original plan was to harden an existing Cognito-backed flow, but the desired launch auth surface — social-only sign-in with Google, Apple, Facebook, and Instagram as separate affordances, and no email/password UX — exceeds what Cognito Hosted UI handles well. Cognito natively supports Google, Apple, and Facebook, but Instagram is not a first-class social provider there. More importantly, managing provider breadth, auth UX, session lifecycle, and token validation across a growing social provider set requires more auth platform investment than the Beerolog team wants to own directly.

That gap creates launch risk. Without a clearly specified, provider-appropriate auth foundation, the supported solo journey lacks a reliable entry point, the API cannot enforce consistent bearer-token expectations, and the production auth setup remains ambiguous.

## Solution

Replace the Cognito-backed auth plan with a Clerk-backed social-first auth foundation so Beerolog has one launch-safe auth contract for the supported solo MVP. This PRD supersedes `docs/prds/auth-session-hardening.md` and is grounded in ADR 0002.

The launch solution is not to build a custom auth system. It is to adopt Clerk as the auth platform, configure it for social-only sign-in, and establish a single stable bearer-token contract between the web app and the FastAPI backend. Launch-ready auth means a user can sign in via any supported social provider, be returned to the intended launch route, refresh or revisit the app with their session intact, and sign out cleanly.

## User Stories

1. As a new user, I want to sign in with Google, Apple, Facebook, or Instagram, so that I can start my Beerolog journey without creating a separate account or password.
2. As a signed-in solo user, I want to start auth from a supported Beerolog route and return to that same supported route after sign-in, so that authentication does not break my flow.
3. As a signed-in solo user, I want a returning visit to restore my session only when it is still valid, so that the app never pretends I am signed in when I am not.
4. As a signed-in solo user, I want an expired or invalid session to send me through a clear recovery path, so that I can get back into the app without manual token clearing.
5. As a signed-in solo user, I want sign-out to fully end my Beerolog session across both the web app and Clerk, so that I am not surprised by stale local state.
6. As a frontend developer, I want one authoritative Clerk-backed session model and one protected-route guard behavior, so that each route does not invent its own auth assumptions.
7. As an API developer, I want one authoritative bearer-token contract for protected endpoints using Clerk-issued tokens, so that web and API auth behavior do not drift apart.
8. As an API consumer, I want expired, malformed, or wrong-token requests to fail with a stable unauthorized contract, so that auth failures are predictable and easy to handle.
9. As an operator, I want Clerk publishable key, secret key, and allowed origins treated as one launch configuration contract, so that production auth setup is verifiable before release.
10. As an operator, I want auth failures categorized clearly enough in logs, so that I can distinguish user expiry, token validation failure, and environment misconfiguration.
11. As a product owner, I want the supported sign-in screen to show exactly the four supported social providers and nothing else, so that launch UX does not promise sign-in options that are not configured.

## Implementation Decisions

- ADR 0002 is the authoritative record for the Clerk/social-first decision. This PRD defines the launch requirements; ADR 0002 captures why.
- The supported launch sign-in providers are Google, Apple, Facebook, and Instagram. Each provider requires production credential setup (OAuth app credentials) before launch. No email/password or magic-link options are part of the supported MVP.
- Browser auth state must be managed through Clerk's frontend SDK (`@clerk/tanstack-react-start`), not through hand-rolled localStorage token management.
- The web app must not maintain any auth state outside of what Clerk provides. The existing `apps/web/src/lib/auth.ts` raw-token approach is not compatible with the Clerk session model and must be replaced.
- The API must validate Clerk-issued session tokens on every protected request. The recommended approach is to fetch Clerk's JWKS endpoint and verify the token in the FastAPI auth dependency. Clerk publishes JWKS at a stable URL derived from the publishable key's frontend API domain.
- The canonical persisted user identifier for all launch persistence is the **Clerk user id** (`userId` from the Clerk session). This replaces the previous Cognito `sub` assumption. The `users.id` column in the database stores the Clerk user id directly.
- Protected-route handling must distinguish loading, authenticated, and signed-out states through one shared guard. Individual routes must not perform bespoke session checks.
- Session expiry or protected-request `401` responses must trigger one recovery path: redirect to sign-in with the safe intended destination preserved.
- The sign-in screen must only show providers that are configured in the Clerk dashboard for the active instance. Unverified providers must not appear on the launch sign-in UI.
- Production auth configuration is part of the launch contract. The Clerk publishable key, secret key, frontend API URL, allowed origins, and provider OAuth credentials must be aligned across Vercel, Railway, and the Clerk dashboard before launch is considered ready.
- Development instances use Clerk's shared OAuth credentials, so provider setup is required only for the production instance.

## Testing Decisions

- A good test for this PRD validates external auth and session behavior: whether a signed-in solo user can enter, resume, lose, and end a session safely across the supported launch journey.
- Automated web coverage should focus on session bootstrap from Clerk state, protected-route guard behavior (loading/authenticated/signed-out), and post-sign-out state clearance.
- Automated API coverage should focus on missing-auth, invalid-token, expired-token, and wrong-key behavior for the protected solo user endpoints.
- Manual launch auth smoke coverage should verify at minimum: sign-in via each of the four supported providers, return to intended route after sign-in, page refresh on a protected route, expired-session recovery, authenticated API calls, and full sign-out.
- Verification must confirm that email/password and any unregistered providers do not appear in the sign-in UI.

## Out of Scope

- Adding guest or anonymous product flows
- Email/password, magic-link, or passkey sign-in
- MFA, account-linking, or multi-identity flows
- Reopening venue, group, challenge, leaderboard, social proof, or operator workflows
- Adding social product features (friend lists, sharing, leaderboards) to the supported MVP
- User management dashboards or admin tools
- Migrating existing users from Cognito (no production users exist yet; Cognito was never launched)

## Further Notes

This PRD establishes the auth foundation for the supported launch path. It does not change the product boundary (ADR 0001 and `docs/prds/launch-scope-freeze.md` remain authoritative). If Beerolog later wants guest-to-account upgrade paths, additional providers, account linking, or social product surfaces, those belong in separate follow-on PRDs.

The previous `docs/prds/auth-session-hardening.md` is superseded by this PRD and ADR 0002 and should be treated as historical only.
