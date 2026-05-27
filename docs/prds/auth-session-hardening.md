# PRD: Auth Session Hardening

> **Status: Superseded.** This PRD is retained as historical context only. It has been superseded by `docs/prds/clerk-social-auth-foundation.md` and ADR 0002 (`docs/adr/0002-clerk-social-first-auth.md`). Do not use this document to guide new implementation work.

## Problem Statement

Beerolog's supported MVP is the signed-in solo flow, which means launch readiness depends on authentication and session handling being dependable rather than merely functional. The current implementation is enough to demonstrate the flow locally, but it still behaves like a thin prototype in several launch-critical places. The browser treats a locally stored Cognito token as the session boundary, protected routes mostly infer "signed in" from whether that token decodes, the callback trusts redirect state too loosely, and sign-out only clears local browser state.

That gap creates launch risk in four ways. First, a returning user can look signed in locally while the API rejects the session, leaving the app in a confusing half-authenticated state. Second, callback, expiry, and invalid-token failures do not yet have one durable recovery path, so users can get stranded on a broken route or bounced unpredictably. Third, the web and API do not yet define one authoritative token and claim contract for protected requests. Fourth, production auth setup depends on multiple aligned Cognito, web, and API settings, but the required launch contract is not yet captured as a single feature-level requirement. Without hardening this path, the signed-in solo MVP cannot be considered launch-ready even if quiz, recommendations, and profile features work in development.

## Solution

Harden the existing Cognito-backed sign-in flow so Beerolog has one launch-safe auth and session contract for the supported solo MVP. This work keeps the current product boundary intact: the only supported authenticated journey remains the signed-in solo user moving through sign-in, quiz, results, profile, persona, and beer history/rating flows.

The launch solution is not to add broader auth scope or a new identity system. It is to make the current signed-in path reliable end to end. That means adopting a safer hosted-auth callback flow for the SPA, validating redirect and callback state explicitly, representing browser auth as a real session instead of a raw token string, handling expiry and invalid-session recovery consistently, aligning the API's JWT validation rules with the browser's bearer token behavior, and defining a deterministic sign-out path. Launch-ready auth means a user can sign in, be returned to the intended supported route, refresh or revisit the app later, recover from session expiry cleanly, and sign out without leftover broken state.

## User Stories

1. As a signed-in solo user, I want to start auth from a supported Beerolog route and return to that same supported route after sign-in, so that authentication does not break my flow.
2. As a signed-in solo user, I want Beerolog to reject invalid or tampered callback state, so that I am never redirected to an unsafe or unintended destination.
3. As a signed-in solo user, I want a returning visit to restore my session only when it is still valid, so that the app never pretends I am signed in when I am not.
4. As a signed-in solo user, I want an expired or invalid session to send me through a clear recovery path, so that I can get back into the app without manual token clearing.
5. As a signed-in solo user, I want refreshes and revisits to keep working across the supported solo journey, so that profile, persona, history, and recommendations feel persistent and dependable.
6. As a signed-in solo user, I want sign-out to fully end my Beerolog session, so that I am not surprised by stale local state or an unintended immediate re-entry experience.
7. As a user, I want the sign-in screen to match the identity providers actually configured for launch, so that the UI does not promise login options that are not truly available.
8. As a frontend developer, I want one authoritative browser session model and one protected-route guard behavior, so that each route does not invent its own auth assumptions.
9. As an API developer, I want one authoritative bearer-token contract for protected endpoints, so that web and API auth behavior do not drift apart.
10. As an API consumer, I want expired, malformed, or wrong-token requests to fail with a stable unauthorized contract, so that auth failures are predictable and easy to handle.
11. As an operator, I want Cognito domain, callback URLs, sign-out URLs, client ID, region, and allowed browser origins treated as one launch configuration contract, so that production auth setup is verifiable before release.
12. As an operator, I want auth failures categorized clearly enough in logs, so that I can distinguish user expiry, callback failure, token validation failure, and environment misconfiguration.
13. As a release tester, I want to verify sign-in, callback success, callback denial, refresh, expired-session recovery, and sign-out against the supported solo flow, so that launch confidence does not depend on happy-path testing alone.
14. As a product owner, I want this PRD to harden only the supported signed-in solo MVP, so that guest, venue, group, challenge, and social flows do not quietly re-enter launch scope.

## Implementation Decisions

- ADR 0001 remains the scope authority for this PRD. The only supported authenticated launch surface is the signed-in solo flow: sign-in, auth callback, quiz, results, profile, persona, history, and beer rating for one user.
- Beerolog keeps Cognito hosted authentication for launch rather than introducing a custom account system or first-party server session store.
- The launch auth flow for the SPA should use the Cognito hosted authorization code flow with PKCE rather than a fragment-delivered implicit token flow. Launch auth hardening should reduce callback fragility and avoid treating a raw URL fragment as the durable session boundary.
- Browser auth state should be represented as a structured session record managed by one auth module, not as a single raw token string. The session record should carry the information required to restore, validate, expire, renew when supported, and clear the session deterministically.
- A stale, malformed, or undecodable browser token is never treated as an authenticated session. Session bootstrap should clear unusable auth state instead of allowing the rest of the app to infer that the user is signed in.
- The web and API must share one explicit bearer-token contract for protected API requests. The chosen token type, expected claims, and failure behavior must be documented and enforced consistently across both sides of the launch flow.
- Auth callback processing must validate an opaque state value created before redirect and must preserve the intended post-auth destination only when it resolves to an allowed same-origin launch route. Arbitrary redirect targets are not part of the launch contract.
- Supported post-auth destinations may include the route state needed to resume the current solo journey, but only for the signed-in launch routes. This PRD does not authorize redirect restoration into deferred group, challenge, venue, or operator flows.
- Auth callback failures, including denied login, missing callback parameters, state mismatch, token exchange failure, or malformed returned data, must land in a signed-out retryable experience rather than silently redirecting the user onward as if sign-in had succeeded.
- Protected-route handling should move behind one shared auth bootstrap and guard contract that distinguishes loading, authenticated, and signed-out states. Launch routes should not each perform bespoke token-presence checks.
- Session expiry or protected-request `401` responses must trigger one recovery path: clear invalid local auth state, preserve the supported next route when safe, and send the user back through the supported sign-in flow.
- Sign-out is not launch-ready if it only removes browser state. The supported sign-out path must clear the Beerolog session and invoke Cognito hosted logout with an allowed post-logout redirect.
- The sign-in UI must only advertise identity providers that are actually configured for the launch Cognito app client. Placeholder provider options are not acceptable launch behavior.
- API JWT validation must verify issuer alignment, region and user-pool alignment, expiration, signing key selection, and the token-use or client-claim rules required by the chosen bearer-token contract.
- API auth failures must return a stable unauthorized response to clients. Detailed JWT decode and claim-validation internals belong in logs and diagnostics, not in launch user-facing error bodies.
- JWKS handling must tolerate normal key rotation. Auth validation should be able to refresh signing keys when an expected key is missing rather than requiring a deploy or process restart to recover.
- Production auth configuration is part of the launch contract. The supported production web origin, callback URL, sign-out URL, Cognito domain, client ID, region, and API CORS origins must be aligned intentionally rather than inferred ad hoc.
- This PRD does not change the supported protected API surface. Launch auth hardening applies to the existing solo user endpoints for profile, history, persona, and beer rating only.

## Testing Decisions

- A good test for this PRD validates external auth and session behavior: whether a signed-in solo user can enter, resume, lose, and end a session safely across the supported launch journey. Tests should not couple to incidental token-storage mechanics more than necessary.
- Automated web coverage should focus on behavior such as sign-in URL generation, safe `next`-route normalization, callback success and failure handling, session bootstrap from persisted state, expired-session clearing, and sign-out behavior.
- Automated API coverage should focus on missing-auth, invalid-token, expired-token, wrong-claim, and key-rotation behavior for the protected solo user endpoints. The key question is whether protected requests are accepted and rejected consistently according to the documented bearer-token contract.
- Existing protected user-route tests are prior art for behavior-first authorization coverage. New auth hardening tests should follow the same style by asserting request/response outcomes rather than internal helper implementation.
- Existing configuration and launch-readiness documentation are prior art for environment verification. Auth hardening verification should continue to treat Cognito configuration alignment and allowed-origin alignment as release-relevant evidence, not optional setup details.
- Manual launch verification remains required because the critical launch path crosses Cognito, the web app, browser storage, and the deployed API. Unit and route tests alone cannot prove that the real hosted sign-in flow is wired correctly.
- Manual auth smoke coverage should verify at least: sign-in from a protected route, callback success to the intended supported route, callback denial handling, page refresh on a protected route, return visit with a still-valid session, expired-session recovery, authenticated API calls after restore, and full sign-out followed by protected-route re-entry.
- Verification should explicitly confirm that deferred surfaces stay out of scope. No launch auth test plan should reopen guest, venue, group, challenge, leaderboard, badge, or social journeys.

## Out of Scope

- Adding guest or anonymous product flows
- Reopening venue, menu-scan, QR, group session, challenge, leaderboard, badge, social proof, or operator workflows
- Introducing a custom Beerolog account system, role model, or admin permissions layer
- Adding MFA requirements, account-linking flows, or broader identity lifecycle features beyond the launch-critical solo sign-in experience
- Redesigning the recommendation, persona, or profile domain behavior outside the auth/session boundary needed to make the supported MVP reliable
- Expanding the API surface to new authenticated product areas beyond the existing solo user endpoints
- Changing the roadmap artifact or publishing this PRD to GitHub issues

## Further Notes

This PRD hardens the supported launch auth path; it does not expand who Beerolog is for or which journeys are live at launch. If Beerolog later wants guest-to-account upgrade paths, invite links, group sign-in behavior, shared sessions, or challenge-specific auth rules, those belong in separate follow-on PRDs and should be checked against the existing launch-boundary ADR.

Launch auth should be interpreted conservatively. If the browser can hold a stale session, if the API and web disagree on bearer-token expectations, if callback handling can redirect unsafely, or if sign-out leaves users in a confusing half-signed-out state, the signed-in solo MVP is not launch-ready yet.
