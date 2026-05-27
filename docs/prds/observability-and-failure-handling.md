# PRD: Observability and Failure Handling

## Problem Statement

Beerolog already has a launch boundary and a launch definition of done, but it does not yet define the minimum observability and failure-handling behavior required to operate the supported MVP confidently once real users are live. The current API already emits request IDs, basic request logs, startup logs, and a health route, but those primitives are not yet tied to an explicit launch bar. Without that bar, the team can ship a product whose happy path works while leaving operators unable to answer basic support questions when auth, persistence, or explanation generation goes wrong.

The missing definition creates four launch risks. First, the deploy health signal can stay green even when the supported solo flow is not truly ready to serve. Second, user-visible failures can become hard to correlate with server logs if request traceability is inconsistent across success, handled errors, and unexpected failures. Third, dependency and configuration problems can collapse into generic server errors that do not tell operators whether the issue is code, environment, or a downstream service. Fourth, observability work can sprawl into dashboards, analytics, and deferred surfaces unless the repo has a narrow, launch-specific definition of what "enough to diagnose" actually means.

## Solution

Define one launch-critical observability and failure-handling bar for the signed-in solo MVP. This PRD narrows the "operator confidence" requirement from the launch definition of done into concrete runtime expectations for the supported API surface.

Launch readiness is satisfied when operators can do four things reliably for the supported MVP:

1. Confirm whether the API is actually ready to serve the signed-in solo flow, not merely whether the process started.
2. Correlate any user-reported failure to a request identifier that appears in both API responses and server logs.
3. Distinguish expected client/auth/configuration/dependency failures from true internal server failures.
4. Diagnose whether a failure blocked the whole request, degraded a non-core sub-step, or reflects a broader launch-readiness problem.

This PRD intentionally stays narrow. It defines the minimum launch bar for request IDs, health semantics, logs, and diagnosability. It does not require a new observability vendor, analytics expansion, or post-launch support tooling.

## User Stories

1. As a signed-in user, I want user-visible server failures to include a request identifier, so that support can investigate my issue without guesswork.
2. As a support operator, I want every supported API response to carry the same request ID that appears in logs, so that I can correlate a reported failure quickly.
3. As a platform operator, I want the health signal to represent launch readiness for the supported MVP, so that a green deploy status means more than "the process booted."
4. As a maintainer, I want request logs for the supported surface to record method, path, status, duration, and request ID, so that I can reconstruct what happened during a report or incident.
5. As a maintainer, I want unhandled exceptions logged with enough context to diagnose them, so that unexpected failures do not become opaque `500` responses.
6. As a maintainer, I want handled dependency and configuration failures to remain explicit, so that missing database or model configuration is distinguishable from an application bug.
7. As a maintainer, I want auth failures to remain diagnosable without leaking bearer tokens or secrets, so that launch logging is useful and safe.
8. As a signed-in user, I want recommendation requests to fail honestly when a launch-critical dependency is unavailable, so that I do not receive misleading success responses.
9. As a signed-in user, I want transient failures in non-core explanation generation to degrade predictably instead of crashing the full recommendation flow, so that the app stays usable when a downstream model hiccups.
10. As a reviewer, I want observability requirements tied only to the supported solo flow, so that deferred venue, group, challenge, leaderboard, and social work does not become part of launch scope.
11. As a planner, I want this PRD to define the smallest acceptable operational bar for launch, so that the team does not turn launch-critical diagnosability into an open-ended platform project.
12. As a future maintainer, I want the failure-handling contract captured in a durable PRD, so that launch behavior does not depend on chat memory or tribal knowledge.

## Implementation Decisions

- ADR 0001 remains the authoritative product boundary for this PRD. Observability and failure handling apply only to the signed-in solo MVP: auth, recommendations, persistent profile, ratings/history, and persona.
- The launch definition of done already requires enough observability for operators to diagnose failures. This PRD defines the minimum concrete runtime behavior needed to satisfy that bar.
- Launch-critical observability work is limited to API runtime traceability and diagnosability for the supported MVP. It does not include product analytics, dashboard work, alerting policy, or deferred feature surfaces.
- The core modules affected by this work are the API observability middleware, the health contract, launch-critical dependency/error boundaries, explanation degradation behavior, and operator-facing runtime guidance.
- Every response from the supported API surface must include a request identifier. If an incoming `X-Request-ID` header is present, the API should preserve it; otherwise the API should generate one and return it in the response.
- Any API-generated `5xx` response must include the same request identifier in the response body so support can correlate failures even when the client only has the error payload.
- Request traceability is part of the launch contract, not a best-effort convenience. Missing request IDs on success, handled errors, or unexpected failures are launch gaps.
- Request logs for the supported surface must exist for every completed request and must include, at minimum, method, path, response status, duration, and request ID. Log format may evolve, but those fields must remain easy to extract.
- Launch logs must help diagnose problems without becoming a privacy or secrets leak. Request bodies, bearer tokens, API secrets, database URLs, and raw third-party credentials are never required log output for this PRD.
- Unhandled exceptions must be logged at exception level with request ID, method, path, and timing context before the API returns a generic internal error response.
- Expected client-side failures should stay explicit rather than being flattened into generic `500` responses. Invalid auth should remain an auth failure, bad request payloads should remain validation/client errors, and missing launch-critical configuration or unavailable dependencies should surface as service-unavailable behavior rather than opaque internal errors.
- Failure handling should distinguish misconfiguration from transient downstream failure where that difference matters operationally. Missing required environment for the supported flow is a launch blocker, not a silent fallback condition.
- `GET /health` is the deploy health endpoint for launch, but its meaning must move beyond "the process responded." Launch health should answer whether the API is ready to serve the supported MVP safely enough for deployment and smoke testing.
- The launch health response must be machine-readable and human-readable enough to expose overall status plus the minimum set of launch-relevant checks. At minimum, it should cover process availability, required configuration presence for the supported MVP, and database readiness for persistence-backed routes.
- Launch health does not need to perform live round-trips to every third-party service on every probe. For Clerk and OpenAI, configuration presence is sufficient for the minimum launch bar; database connectivity is the active readiness check required because persistence-backed user flows depend on it directly.
- Health output must not expose secrets, raw connection strings, or sensitive configuration values. It should communicate readiness state, not leak credentials.
- Graceful degradation is allowed only when the supported user action still completes honestly and diagnosably. The current recommendation-explanation fallback path is acceptable for transient model-call failures only if the degradation is logged with request context and the recommendation response remains truthful.
- Persistent or configuration-driven loss of explanation generation is not considered healthy launch behavior just because fallback text exists. If explanation generation is materially absent in the supported flow, launch readiness is not met.
- Startup and shutdown logs are part of the launch observability contract. Operators should be able to see the runtime environment, the intended browser origins, and whether launch-critical dependencies are configured, without exposing sensitive values.
- This PRD does not require distributed tracing, percentiles, dashboards, or vendor-specific metrics to launch. Plain application logs, a meaningful health response, clear request IDs, and explicit failure semantics are the minimum acceptable launch bar.

## Testing Decisions

- A good test for this PRD verifies externally visible diagnosability and failure behavior, not the internal implementation of logging helpers. The question is whether operators and clients can understand failures in the supported MVP, not how the middleware is written.
- Existing route and health tests are prior art for this work. They already validate the current request-ID and response behavior and should be extended in the same behavior-oriented style.
- Automated verification should confirm that supported routes always return `X-Request-ID`, including successful requests, expected client errors, service-unavailable responses, and unhandled-server-error paths.
- Automated verification should confirm that API-generated `500` responses include the request ID in the error body and that the request ID matches the response header.
- Health-route tests should evolve from simple "status is ok" assertions to launch-readiness behavior: healthy when required state is present, non-healthy when critical launch requirements such as database readiness are not met, and safe in the information they expose.
- Dependency-boundary tests should cover the supported solo routes that rely on persistence or explanation generation. The important behavior is that missing or unavailable launch-critical dependencies produce explicit, diagnosable failure responses instead of generic crashes.
- Recommendation tests should cover transient explanation-generation failure as a degradation path: recommendations can still complete with fallback explanation text, and the failure must remain observable in logs.
- Logging-focused tests should validate durable behavior rather than overfitting a full log string. Capturing the presence of required fields and error correlation is more valuable than snapshotting the exact text format.
- Manual launch verification should include at least one request-correlation drill in a production-like environment: trigger a supported request, capture its request ID from the client side, and verify the same ID appears in API logs.
- Manual launch verification should also include a health check review and at least one representative failure-path review for the supported MVP, such as an invalid auth request or a temporarily unavailable persistence path, so operators know the runtime behavior matches the PRD before release.

## Out of Scope

- Expanding the product boundary beyond the signed-in solo MVP
- Adding observability requirements for deferred venue, scan, group, challenge, leaderboard, badge, or social surfaces
- Requiring a third-party observability platform, dashboard suite, metrics warehouse, or analytics implementation as part of launch
- Defining SLOs, paging rotations, alert routing, or broader incident-management process
- Logging user-sensitive request payloads, auth tokens, secrets, or raw credentials for convenience
- Building admin consoles, support tooling, or customer-facing failure dashboards
- Treating post-launch operational maturity work as a launch blocker if the minimum diagnosability bar defined here is already met

## Further Notes

This PRD intentionally defines the smallest operational bar that still makes the supported Beerolog MVP supportable at launch. It assumes the team wants enough runtime visibility to debug real failures, not a full observability program before first release.

If Beerolog later needs dashboards, alerts, SLOs, cross-service tracing, or observability requirements for deferred social and venue systems, that work should start from a separate PRD rather than being folded into this launch-critical document.
