# PRD: Launch Scope Freeze

## Problem Statement

Beerolog already has an approved launch-first direction, but the repository still contains broader venue, group, challenge, and social concepts as future work. Without a dedicated PRD that freezes the launch boundary, later PRDs and issue slices can accidentally treat those deferred surfaces as current launch requirements.

That drift creates three risks. First, contributors can no longer tell which product surface is authoritative for launch. Second, implementation work can spread across too many user journeys at once instead of finishing the signed-in solo path. Third, follow-on planning can mistake code or documentation for deferred ideas as approval to re-expand the MVP.

## Solution

Freeze the authoritative launch scope around Beerolog's signed-in solo flow and make that boundary explicit enough to reuse in every later planning artifact. This PRD should define the supported launch journey, enumerate the supported web and API surfaces, list the deferred surfaces that stay out of launch, and establish guardrails for how future PRDs and issue slices must refer to deferred work.

This is a boundary-setting feature, not a product-expansion feature. It should preserve visibility into deferred venue, social, and group ideas while making it clear that reopening any of them requires an intentional follow-on planning step rather than incidental mention in a later document.

## User Stories

1. As a roadmap owner, I want one authoritative launch boundary, so that future planning work does not re-expand the MVP by accident.
2. As a contributor, I want the signed-in solo journey defined as the supported launch flow, so that I know which user path to optimize first.
3. As a frontend developer, I want the supported launch screens called out explicitly, so that deferred venue or group routes are not treated as missing launch work.
4. As an API developer, I want the supported launch endpoints called out explicitly, so that deferred endpoints remain follow-on work instead of implied requirements.
5. As a reviewer, I want future PRDs checked against clear scope guardrails, so that requirements drift is caught before issue slicing begins.
6. As an agent, I want deferred surfaces to remain visible but clearly marked as deferred, so that I can reference them as context without treating them as part of launch.
7. As a maintainer, I want the launch scope to include auth, quiz, recommendations, persistent profile, ratings/history, and persona, so that the core learning loop stays intact.
8. As a planner, I want venue QR, menu scan, group, challenge, leaderboard, social proof, badge, and operator tooling work kept out of launch, so that the MVP stays focused.
9. As a future feature owner, I want a defined process for reopening deferred surfaces, so that scope expansion happens through a deliberate product decision.
10. As a collaborator, I want repository documents to use supported-versus-deferred language consistently, so that the same boundary is preserved across handoffs.
11. As an implementer, I want code that remains in the repo for deferred features to stay clearly non-authoritative for launch, so that code presence is not mistaken for scope approval.
12. As a release decision-maker, I want launch readiness judged against the frozen solo scope rather than the long-term roadmap, so that launch criteria remain achievable and explicit.

## Implementation Decisions

- The authoritative launch boundary is the signed-in solo flow only.
- In-scope launch capabilities are authentication, solo quiz completion, beer recommendations, persistent user profile, beer ratings/history, and persona derivation from the user's taste profile.
- The supported launch web surface is limited to the landing page plus the signed-in solo journey: sign-in, auth callback, quiz, results, and profile.
- The supported launch API surface is limited to health, recommendations, user profile read/write, beer history read/write, persona lookup, and beer rating submission.
- Deferred surfaces remain out of launch even if supporting code or documentation already exists: venue QR flows, tap-list and menu-scan workflows, group sessions, friend challenges, leaderboards, social proof, badges/milestones, and broader bar or operator tooling.
- Future PRDs and issue slices may mention deferred surfaces only as follow-on context, integration constraints, or explicit non-goals. They must not treat deferred surfaces as launch requirements unless the boundary is intentionally reopened.
- Documentation that describes Beerolog's current MVP should use explicit supported-versus-deferred language rather than ambiguous phrases like "planned soon" or "later phase" without naming the current boundary.
- Reopening a deferred surface requires a new PRD that names the surface being expanded, explains the user problem and launch rationale for the change, and records the new boundary through a follow-on ADR update or new ADR before issue slicing begins.
- Reopening one deferred area does not automatically reopen related areas. Each surface should be justified on its own merits.
- This PRD is a scope-freeze artifact, not a mandate to delete deferred modules from the repository. Repository presence does not make a deferred surface part of the launch contract.

## Testing Decisions

- A good test for this PRD validates external planning behavior: later requirements and issue slices can be checked against a clear launch boundary without relying on chat memory.
- Review should confirm that the supported launch journey, supported surfaces, deferred surfaces, and reopen rules are all explicit and easy to reuse in later docs.
- Verification should specifically check that auth, quiz, recommendations, persistent profile, ratings/history, and persona are treated as supported launch capabilities together, since they form the core solo learning loop.
- Verification should also check that venue, scan, group, challenge, leaderboard, social, badge, and operator workflows are listed as deferred rather than phrased as partial launch commitments.
- Prior art should come from the repo's existing concise markdown style and from the accepted launch-boundary ADR, which already defines supported-versus-deferred language for the cleaned MVP.
- If a future PRD proposes work in a deferred area, review should fail unless that PRD explicitly states that it is reopening the boundary and pairs the change with the required architectural decision update.

## Out of Scope

- Implementing or wiring any new runtime feature
- Changing the roadmap artifact or expanding the approved roadmap
- Creating GitHub issues or syncing this scope freeze to an external tracker
- Designing detailed solutions for deferred venue, scan, social, group, challenge, badge, or operator features
- Deciding launch sequencing within the supported solo flow beyond freezing the overall boundary
- Removing deferred code that currently remains in the repository as follow-on work

## Further Notes

This PRD reinforces the accepted launch-first boundary already captured in Beerolog's context and architecture documents. Its job is to make that boundary durable at the feature-requirements level so later PRDs and issue slices inherit the same constraints by default.

Later planning work should treat this PRD as a gate before expanding into deferred surfaces. If Beerolog decides to launch venue, group, or social functionality later, that decision should start with a new PRD for the specific surface and then record the boundary change in an ADR before execution slices are created.
