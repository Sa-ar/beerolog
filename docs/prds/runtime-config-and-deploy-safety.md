# PRD: Runtime Config and Deploy Safety

## Problem Statement

Beerolog now has an explicit launch boundary and an explicit launch definition of done, but the runtime configuration needed to operate that supported MVP is still spread across code defaults, setup READMEs, and provider-specific notes. There is not yet one durable feature artifact that defines what runtime values must exist, how non-development deploys should behave when configuration is unsafe, and what deploy checks are required before the signed-in solo flow can be considered safe to launch.

That gap creates launch risk even if the supported product flow is otherwise implemented. A deploy can look healthy in local development but still fail in preview or production because web, API, Cognito, Neon, Railway, Vercel, and OpenAI settings are misaligned. Unsafe defaults can slip through. Auth callback URLs, API CORS origins, and live web origins can drift apart. Database migrations can be skipped. Operators can be left with partial logs and no clear release checklist. For a launch-first MVP whose supported surface is intentionally narrow, that kind of runtime drift can break the entire supported user journey at once.

## Solution

Define one launch-focused runtime-config-and-deploy-safety feature for the supported Beerolog MVP. This feature should make the runtime contract explicit across the web app, API, auth provider, database, and hosting platforms, and it should define the deploy-safety work required to keep those systems aligned at launch.

The feature should stay focused on reliable launch of the existing signed-in solo experience, not on new product capability. It should establish which configuration values are required in each environment, what non-development safety checks must happen before or during startup, what deploy sequence is expected, and what verification evidence must exist before a release is considered safe. The end result is a repeatable launch path that fails early on unsafe configuration instead of relying on tribal knowledge or post-deploy debugging.

## User Stories

1. As a roadmap owner, I want runtime configuration and deploy safety defined as a launch feature, so that release readiness is not left to scattered docs and memory.
2. As a maintainer, I want the signed-in solo flow to remain the only supported launch surface for this work, so that runtime-hardening effort does not drift into deferred venue, group, or social features.
3. As an operator, I want one authoritative runtime contract for the web app, API, Cognito, Neon, Railway, Vercel, and OpenAI, so that I know exactly what must be configured before launch.
4. As a developer, I want local development to remain straightforward while preview and production deployments become stricter, so that I can move quickly locally without normalizing unsafe live defaults.
5. As a release manager, I want production deploys to fail early when critical configuration is missing or clearly unsafe, so that broken launches are caught before users hit them.
6. As a signed-in user, I want auth redirects, callback handling, and API access to agree on the same live origins, so that sign-in works reliably in the deployed app.
7. As a signed-in user, I want my profile, ratings, persona, and history to use a real migrated database in deployed environments, so that the supported MVP behaves like a persistent product rather than a demo.
8. As a maintainer, I want default development secrets and placeholder values blocked from live environments, so that unsafe configuration does not silently reach launch.
9. As a reviewer, I want explicit rules for allowed CORS origins and supported deploy origins, so that wildcard or accidental origin expansion is caught before release.
10. As a support person, I want deploy health checks, request IDs, and request logs preserved at launch, so that I can trace user-facing failures quickly.
11. As a contributor, I want contract-sync checks between the API description and web client expectations treated as deploy-safety requirements, so that a release cannot ship with incompatible runtime assumptions.
12. As a collaborator, I want a clear deploy order and post-deploy smoke checklist, so that launching the supported MVP is repeatable by someone other than the original author.
13. As a maintainer, I want secret handling documented by variable name and ownership without storing live values in the repo, so that configuration stays durable without leaking credentials.
14. As a planner, I want this PRD to stay focused on launch runtime safety for the current stack, so that it does not turn into a broader infrastructure redesign.

## Implementation Decisions

- ADR 0001 remains the authoritative scope boundary for this PRD. Runtime hardening applies only to the signed-in solo MVP: auth, quiz completion, recommendations, persistent profile, ratings/history, and persona.
- Deferred venue, scan, group, challenge, leaderboard, badge, and social surfaces remain out of scope for runtime-launch requirements even if related code or documentation exists elsewhere.
- Runtime configuration for launch should be treated as one cross-system contract, not as separate ad hoc provider setups. The launch contract covers four linked planes: web runtime values, API runtime values, provider configuration, and release/deploy procedure.
- The environment model remains `development`, `preview`, and `production`. `development` may keep local-friendly defaults, but `preview` and `production` are deploy environments and must use explicit non-placeholder configuration.
- Non-development API startup should fail closed when critical runtime configuration is missing. At minimum, live deploys must not start successfully without a real database connection, an OpenAI key, Cognito identifiers, and an explicit non-default application secret.
- `API_SECRET` must never use the development default in `preview` or `production`. Unsafe placeholder secrets are launch blockers even if the most visible user flow does not exercise every tokenized path directly.
- Non-development API configuration must require an explicit origin allowlist. Allowed browser origins should be exact supported origins rather than wildcards or implicit broad matching.
- The web runtime contract for deploys includes an explicit API base URL, Cognito hosted UI domain, and Cognito client ID for each supported environment. Those values must align with the same environment's API and Cognito setup.
- Cognito callback URLs and sign-out URLs are part of the runtime contract, not optional setup detail. Every intentionally supported deployed web origin must be registered there, and unsupported origins should not be added speculatively.
- The launch runtime contract should keep the API and web aligned to the same supported origin set. A deploy is not safe if the web origin, API CORS allowlist, and Cognito redirect configuration describe different environments.
- Deployed runtime behavior for the supported MVP must use real persistence. Test overrides and in-memory substitutes remain acceptable only for tests and local development, not for preview or production launch paths.
- Database migration status is a deploy-safety concern. A launch is not safe unless the target database has the required schema for the supported MVP before the deployed flow is exercised.
- Deploy safety should include a single durable environment matrix in `docs/ops/environment-matrix.md` that names required variables, allowed values or formats, provider ownership, and where each value must be configured. The matrix should describe secrets without storing the secret values themselves.
- Deploy safety should also include operator-facing launch checklists under `docs/ops/checklists/` that cover pre-deploy configuration review, migration readiness, deploy order, health verification, and post-deploy smoke evidence.
- The required deploy order is: confirm environment configuration, confirm provider alignment, apply pending database migrations, verify API health in the deployed environment, verify the web app against the live API, then run the supported signed-in solo smoke flow.
- Runtime observability for launch has a minimum floor: health checks, request logging, request identifiers, and startup/runtime signals that reveal whether critical subsystems are configured without leaking secrets.
- Contract integrity is part of deploy safety. The API description and generated or consumed web contract artifacts must remain synchronized at release time, and contract drift is a launch blocker.
- Documentation for runtime config and deploy safety should be authoritative enough that a future maintainer can perform a safe launch without recovering hidden context from chat history.
- This PRD hardens the current deployment model built around Vercel, Railway, Cognito, Neon, and OpenAI. It does not require adopting new platforms, new observability vendors, or a broader infrastructure rewrite before launch.

## Testing Decisions

- A good test for this PRD validates externally meaningful deploy-safety behavior: unsafe non-development configuration is rejected, supported deploy signals remain visible, contract drift is caught, and the signed-in solo flow can be verified after deploy with a repeatable checklist.
- Configuration tests are prior art for this work. Existing settings tests already verify parsing behavior for origin configuration, and future config-hardening tests should extend that approach to required non-development validation and unsafe-default rejection.
- Health-route tests are prior art for deploy verification. They already treat health status and request ID propagation as part of the supported runtime surface, and deploy-safety work should preserve that behavior.
- Contract-authority tests are prior art for release blocking on API/web agreement and supported-surface boundaries. Runtime/deploy-safety work should continue to treat contract drift and accidental surface expansion as failures, not warnings.
- Repository-wide type checking, linting, and API tests remain part of the automated safety baseline because deploy safety depends on the shipped web and API surfaces agreeing with their documented contracts.
- Automated verification should add or preserve focused coverage for the non-development runtime contract: required settings, origin validation, secret-default rejection, and any startup behavior that intentionally blocks unsafe deploys.
- Manual smoke validation remains required because provider alignment, live auth redirects, CORS behavior, deployed secrets, and migration state cannot be proven fully by unit tests alone.
- Manual launch smoke should cover the supported deployed journey end to end: sign in, return through the auth callback, complete or reuse the quiz/profile state, fetch recommendations with explanations, view persona/profile state, submit a rating, and confirm persisted history/profile behavior after refresh or re-entry.
- Release evidence should record which environment was validated, whether migrations were applied, whether API health passed, whether the supported smoke flow passed, and which known non-blocking follow-ups were accepted.

## Out of Scope

- Adding new product functionality to the supported MVP
- Reopening deferred venue, scan, group, challenge, leaderboard, badge, or social surfaces
- Rewriting the launch roadmap or changing the accepted MVP boundary
- Replacing Vercel, Railway, Cognito, Neon, or OpenAI with different providers as part of this feature
- Designing a full CI/CD platform overhaul beyond the deploy-safety checks needed for launch
- Introducing broad new observability products or advanced production tooling that are not necessary for launch-safe operation
- Defining long-term multi-region, high-availability, or post-scale infrastructure strategy

## Further Notes

This PRD narrows the runtime portion of launch readiness into a concrete feature-level artifact. The launch-definition PRD says that production configuration and operator confidence are required; this PRD defines the runtime and deploy-safety work that makes those expectations concrete for the current Beerolog stack.

If the supported MVP boundary changes later, or if Beerolog adopts a meaningfully different deploy architecture, that should be captured in a new follow-on PRD and, if needed, an ADR update rather than quietly expanding this launch-safety document.
