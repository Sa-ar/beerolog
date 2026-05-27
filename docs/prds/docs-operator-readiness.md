# PRD: Docs Operator Readiness

## Problem Statement

Beerolog now has a defined launch boundary and a growing set of setup and provider docs, but an operator still has to piece together critical context from multiple READMEs, service notes, and prior chat history. That is acceptable for active development, but it is not enough for a supported MVP that someone needs to set up, deploy, support, and reason about later without the original author present.

The current gap is not a lack of information so much as a lack of authoritative operator packaging. The supported surface is clear in `CONTEXT.md` and ADR 0001, the stack is documented in the root and app READMEs, and the providers each have setup notes, but the system still lacks one durable documentation feature that answers four operator questions end to end:

1. What exactly is the supported MVP, and what is explicitly deferred?
2. How do I configure and deploy the signed-in solo flow safely across web, API, auth, database, and model provider?
3. How do I verify that launch-critical behavior works after setup or deploy?
4. How do I diagnose the most likely failures without reconstructing context from memory or chat logs?

Without that documentation layer, Beerolog can appear launch-ready while still being operationally fragile. A maintainer can miss a required environment variable, deploy web and API origins that do not match Clerk or CORS settings, skip database migrations, misunderstand which routes are actually supported, or fail to use the available runtime signals when debugging a live issue.

## Solution

Define a documentation-focused launch feature that makes Beerolog operator-ready for the supported signed-in solo MVP. This feature does not add new product scope or infrastructure. Instead, it defines the documentation set required for a future maintainer or operator to understand the supported boundary, prepare local and deployed environments, release the app safely, and support users using the runtime signals already present in the stack.

The documentation outcome should be treated as one coherent operator surface, not a loose collection of notes. That surface should give a maintainer one clear entry point and enough linked reference material to:

1. Understand the supported MVP and its deferred boundaries.
2. Set up the stack locally for the signed-in solo flow.
3. Configure web, API, Clerk, Neon, Railway, Vercel, and OpenAI correctly for preview and production-like environments.
4. Deploy in the correct sequence with clear pre-deploy and post-deploy checks.
5. Run a durable smoke checklist for the supported user journey.
6. Diagnose common failures in auth, configuration, deploy alignment, persistence, and recommendation support without relying on chat history.

This PRD is intentionally documentation-first. Its purpose is to make the already-supported MVP operable and supportable through durable written guidance.

## User Stories

1. As a maintainer, I want one authoritative operator entry point, so that I know where to start instead of searching through scattered docs.
2. As a maintainer, I want the supported signed-in solo MVP described explicitly, so that I do not mistake deferred venue, group, challenge, or social code for launch scope.
3. As a new contributor, I want a clear explanation of how the web app, API, auth provider, database, and OpenAI fit together, so that I can reason about the system without reverse-engineering it from code.
4. As an operator, I want local setup for the supported flow documented end to end, so that I can bring up a working development environment without hidden steps.
5. As an operator, I want a durable environment matrix for web, API, and provider configuration, so that I know which values are required, where they live, and how the systems align.
6. As an operator, I want Clerk allowed origins, social provider OAuth redirect URIs, Vercel origins, and API CORS origins documented as one aligned contract, so that sign-in works reliably after deploy.
7. As an operator, I want the database migration requirement documented in the deploy path, so that the deployed MVP uses real persistence instead of partially working by accident.
8. As a release manager, I want one documented deploy sequence for the current stack, so that launch can be repeated by someone other than the original author.
9. As a release manager, I want a post-deploy smoke checklist for the signed-in solo flow, so that I can verify launch behavior consistently after changes.
10. As a support person, I want a documented explanation of the available runtime signals, so that I know how to use health checks, request IDs, and logs to investigate user-facing failures.
11. As a support person, I want common failure modes documented, so that I can quickly narrow issues like bad Clerk configuration, CORS drift, missing migrations, unsafe secrets, or unavailable social provider credentials.
12. As a maintainer, I want the documentation to explain which behaviors depend on Neon, Clerk, Railway, Vercel, and OpenAI, so that I can reason about blast radius when one provider is misconfigured.
13. As a reviewer, I want operator docs to stay aligned with the accepted launch boundary and launch definition of done, so that documentation work reinforces the supported MVP instead of expanding it.
14. As a collaborator, I want docs to state what is authoritative versus what is supporting reference material, so that duplicated or stale instructions do not create operational drift.
15. As a maintainer, I want secret handling documented by variable name and ownership without committing live values, so that the docs remain useful and safe.
16. As a future operator, I want the documentation to stand on its own without chat-history dependency, so that support and launch readiness survive team turnover and time gaps.

## Implementation Decisions

- ADR 0001 remains the authoritative scope boundary for this PRD. Operator-readiness documentation applies only to the signed-in solo MVP: auth, quiz, recommendations, profile, ratings/history, and persona.
- Deferred venue, scan, group, challenge, leaderboard, badge, social, and broader bar/operator-tooling surfaces may be mentioned only to clarify that they are not part of the supported operator surface.
- Durable operational artifacts live under `docs/ops/`: the shared environment matrix in `docs/ops/environment-matrix.md`, operator checklists in `docs/ops/checklists/`, and release evidence records in `docs/ops/releases/`.
- This feature is documentation work for the current stack, not a request to expand product scope, redesign infrastructure, or add new runtime capabilities before launch.
- The operator-readiness outcome should present one clear operator-facing entry point that links to the rest of the required reference material. A maintainer should not need chat history to know which document to trust first.
- The operator documentation set must cover five concerns explicitly: supported-system boundary, local setup, environment and provider configuration, deploy and release procedure, and support/troubleshooting guidance.
- The supported-system boundary documentation must explain the signed-in solo journey, the major runtime dependencies, and the architectural path from browser to web app, API, database, auth provider, and explanation provider.
- The environment documentation must describe the required runtime variables for the web app and API, the provider settings that must align with them, which values are secrets, and which unsafe defaults are unacceptable outside development.
- `API_SECRET` must be documented as unsafe when left at its development default in non-development environments. Operator docs should treat that default as a launch blocker, not a harmless detail.
- Operator docs must describe origin alignment as one contract across Vercel, Railway, and Clerk. Supported web origins, API CORS allowlist values, and Clerk allowed origins should be documented together so drift is easier to detect.
- The deploy procedure must lock in a durable release sequence for the supported MVP: confirm configuration, confirm provider alignment, apply database migrations, verify deployed API health, verify the web app against the live API, and then run the signed-in solo smoke flow.
- The post-deploy verification guidance must cover the supported journey end to end: sign in, return through the auth callback, complete or reuse the quiz/profile state, fetch recommendations with explanations, view persona/profile state, submit a rating, and confirm persisted history/profile behavior after refresh or re-entry.
- The support guidance must explain the minimum runtime signals already available for the MVP: health checks, request logging, `X-Request-ID`, and the request ID returned on unhandled server errors.
- The support guidance must include first-line troubleshooting for likely launch issues, including callback URL mismatch, CORS mismatch, missing or bad environment values, migration drift, and provider-access failures.
- Operator-facing docs must distinguish authoritative instructions from supporting provider reference material. Existing README and provider documents can remain as references, but the operator flow should not depend on readers discovering them by accident.
- Documentation must preserve the current repo language and markdown style, including explicit supported-versus-deferred terminology and alignment with the launch-definition-of-done expectations.
- This feature complements launch readiness by making the launch and support path durable in writing. It does not require new providers, new observability vendors, or documentation for deferred surfaces beyond boundary clarification.

## Testing Decisions

- A good test for this PRD is whether a maintainer who was not part of the original chat can use the documentation alone to understand the supported boundary, configure the stack, deploy it, run the signed-in solo smoke flow, and investigate common failures.
- Verification for this documentation feature should prioritize cold-start walkthroughs over superficial prose review. The important question is whether the docs are operationally usable, not merely well written.
- Local verification should confirm that a maintainer can follow the documented setup path for the supported MVP without hidden steps or conflicting instructions between root, app, and provider docs.
- Deploy verification should confirm that a maintainer can follow the documented release sequence, align provider settings, validate health, and run the documented post-deploy smoke flow.
- Troubleshooting verification should confirm that the operator docs explain how to use request IDs, health responses, and logs to narrow common failures in the supported flow.
- Existing READMEs, provider docs, and launch-readiness PRDs are prior art for this work. They should inform the operator docs, but the finished documentation surface should be more authoritative and easier to execute than the current scattered references.
- Documentation review should explicitly check for scope drift. The docs should reinforce the supported MVP boundary and should not accidentally imply that deferred routes or workflows are supported at launch.
- Link and content consistency matter, but they are secondary signals. A documentation change is not done until the written guidance has been walked through and shown to support the intended operator tasks.
- Release evidence for this feature should record which setup, deploy, and troubleshooting walkthroughs were run from the docs and where any remaining gaps or ambiguities were found.

## Out of Scope

- Expanding the supported MVP beyond the signed-in solo flow
- Reopening deferred venue, scan, group, challenge, leaderboard, badge, or social surfaces as launch requirements
- Rewriting the roadmap or changing the accepted launch-first product boundary
- Replacing Vercel, Railway, Clerk, Neon, or OpenAI with different providers
- Designing a full internal platform, SRE handbook, or post-scale operations program
- Adding new product behavior, admin tooling, or support tooling that is not necessary for documenting the supported MVP
- Documenting deferred workflows in operational detail beyond clearly marking them as out of scope

## Further Notes

This PRD is the documentation counterpart to the launch-readiness work already captured elsewhere. The launch-definition artifact says that documentation and operator confidence are part of launch readiness; this PRD defines the documentation work required to make that statement true for the current Beerolog MVP.

If the supported product boundary or deployment architecture changes later, the operator-readiness docs should evolve through a new PRD or follow-on update rather than quietly absorbing new scope.
