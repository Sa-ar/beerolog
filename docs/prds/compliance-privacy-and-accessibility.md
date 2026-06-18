# PRD: Compliance — Privacy and Accessibility

## Problem Statement

Beerolog is a public-facing, bilingual web product that stores signed-in user data, sets browser cookies, and relies on third-party processors for auth, hosting, persistence, and model inference. The supported MVP already handles age verification, Hebrew/English localization, and some accessibility affordances, but the repository does not yet define a durable compliance bar for GDPR, Israeli privacy law, or Israeli accessibility law.

That gap creates launch and operational risk in four areas. First, users have no transparent notice of what Beerolog collects, why it is processed, or which third parties receive it. Second, browser cookies are set without a documented classification or user-facing disclosure. Third, signed-in users have no supported path to export or delete the personal data Beerolog stores beyond what Clerk may offer independently. Fourth, the product has not been evaluated against Israeli Standard SI 5568 (WCAG 2.0 Level AA), does not publish an accessibility statement, and lacks automated accessibility checks in the verification workflow.

Without an explicit PRD, compliance work can drift into ad hoc legal copy, inconsistent accessibility fixes, or launch blockers argued case by case. This document defines one launch-focused compliance program for the supported signed-in solo MVP.

## Solution

Define one durable compliance feature for Beerolog covering privacy transparency, cookie disclosure, data-subject rights for Beerolog-owned data, and accessibility to SI 5568 / WCAG 2.0 Level AA.

The solution has five required parts:

1. **Legal and transparency surfaces** — privacy policy, terms of use, cookie notice, and accessibility statement in Hebrew and English, reachable from every page.
2. **Cookie governance** — explicit classification and disclosure for existing cookies (`age_verified`, `lang`) and a consent posture that blocks non-essential tracking until the product intentionally adds it.
3. **Data-subject rights for Beerolog data** — documented data inventory, account deletion that cascades through Beerolog persistence, and a first-version data export for the supported MVP tables tied to the signed-in user.
4. **Accessibility program** — technical remediation to WCAG 2.0 AA on supported flows, an accessibility statement with coordinator contact, and automated plus manual verification hooks.
5. **Operator readiness** — processor inventory, DPA checklist, and prelaunch evidence requirements so launch confidence includes legal and accessibility artifacts.

This PRD stays within ADR 0001's supported solo MVP boundary. It does not add product features beyond what compliance requires, and it does not reopen deferred venue, group, or social surfaces.

## User Stories

### Privacy transparency

1. As a visitor, I want to read a clear privacy policy in my language, so that I understand what Beerolog collects and why before I sign in.
2. As a visitor, I want to read terms of use in my language, so that I know the rules for using an alcohol-related recommendation product.
3. As a privacy-conscious user, I want the privacy policy to list Beerolog's sub-processors (Clerk, hosting, database, model provider), so that I understand who else may handle my data.
4. As a privacy-conscious user, I want the privacy policy to explain what Beerolog stores locally in the database versus what Clerk stores for authentication, so that I know where to exercise my rights.
5. As a user in the EU or Israel, I want the privacy policy to describe my rights (access, correction, deletion, portability, objection where applicable), so that I know how to exercise them.
6. As a user, I want legal pages linked from the site footer on every page, so that I do not have to hunt for policies.
7. As an operator, I want one documented data inventory for the supported MVP, so that legal review and incident response do not depend on reading the schema ad hoc.
8. As an operator, I want a DPA / sub-processor checklist for launch vendors, so that third-party processing is reviewable before release.

### Cookies and consent

9. As a visitor, I want to know that Beerolog sets cookies before or when they are stored, so that cookie use is transparent.
10. As a visitor, I want `age_verified` described as essential for age-gating alcohol-related content, so that I understand why that cookie exists.
11. As a visitor, I want `lang` described as a functional preference cookie, so that I understand why language persists across visits.
12. As a visitor, I want a cookie notice that does not block essential site function for age verification and language preference, so that compliance does not break the supported journey.
13. As a product owner, I want a documented rule that analytics or marketing cookies require explicit opt-in before activation, so that future instrumentation does not silently violate the compliance posture.
14. As a maintainer, I want cookie names, purpose, duration, and type centralized in one module, so that legal copy and implementation stay aligned.

### Data-subject rights

15. As a signed-in user, I want to delete my Beerolog account and associated taste profile, ratings, and history from Beerolog storage, so that I can exercise my right to erasure.
16. As a signed-in user, I want account deletion to sign me out and stop future authenticated access, so that deletion feels complete from my perspective.
17. As a signed-in user, I want to export a machine-readable summary of the personal data Beerolog stores about me, so that I can exercise portability for Beerolog-owned fields.
18. As a signed-in user, I want export to include baseline taste dials, flavor-family values, novelty affinity, ratings, optional rating notes, and account metadata Beerolog stores, so that the export is meaningfully useful.
19. As a signed-in user, I want export to exclude internal-only vectors if they are not human-readable, but the policy must disclose that embeddings exist and their purpose, so that transparency and practicality are balanced.
20. As a signed-in user, I want a settings surface that explains how to delete my account and export my data, so that rights are discoverable without contacting support.
21. As a support operator, I want deletion and export actions logged with request ID and user id (not email in client-visible logs), so that compliance actions are auditable.
22. As an API developer, I want one authoritative deletion contract that cascades through `users`, `user_baseline_taste`, and `beer_ratings`, so that orphaned personal data does not remain after erasure.
23. As a privacy-conscious user, I want the privacy policy to explain that session intent and ephemeral recommendation context are not persisted as standalone records in the supported MVP, so that my expectations match actual retention.

### Accessibility (SI 5568 / WCAG 2.0 AA)

24. As a user with disabilities, I want the supported solo journey to be operable by keyboard alone, so that I can sign in, complete onboarding, and receive recommendations without a pointer device.
25. As a screen-reader user, I want pages to have a logical heading structure and landmark regions, so that I can navigate efficiently.
26. As a screen-reader user, I want interactive controls to have accessible names and states, so that buttons, toggles, and dialogs are understandable.
27. As a user with low vision, I want text and controls to meet WCAG 2.0 AA contrast requirements on supported surfaces, so that content remains readable.
28. As a keyboard user, I want visible focus indicators on all interactive elements in supported flows, so that I can see where I am in the UI.
29. As a screen-reader user, I want modal dialogs (including the age gate) to trap focus, return focus on close, and expose title and description, so that overlays are usable.
30. As a user, I want a skip link to main content, so that I can bypass repeated header navigation.
31. As a Hebrew-speaking user with disabilities, I want RTL layout and screen-reader behavior to remain correct after accessibility fixes, so that compliance work does not regress bilingual support.
32. As a user sensitive to motion, I want animations that are decorative to respect `prefers-reduced-motion`, so that the UI does not cause unnecessary vestibular discomfort.
33. As a user with disabilities, I want to read an accessibility statement in Hebrew (and English), so that I know the site's conformance target and how to request help.
34. As a user with disabilities, I want contact details for Beerolog's accessibility coordinator in the accessibility statement, so that I can report barriers.
35. As a maintainer, I want automated accessibility checks on key supported routes in CI, so that regressions are caught before release.
36. As a QA operator, I want a manual accessibility checklist in prelaunch verification, so that keyboard and screen-reader smoke coverage is repeatable.
37. As a reviewer, I want known accessibility gaps documented with remediation timeline if not fixed before launch, so that transparency obligations under SI 5568 can still be met honestly.

### Launch and operations

38. As a release owner, I want legal and accessibility artifacts treated as launch evidence, so that shipping does not depend on undocumented compliance assumptions.
39. As a maintainer, I want compliance requirements scoped to the supported signed-in solo flow, so that deferred surfaces do not expand the launch bar accidentally.
40. As a legal reviewer, I want Beerolog to flag that counsel must review final policy text before production, so that engineering does not mistake draft copy for legal advice.
41. As an operator, I want recommendation and onboarding flows to avoid logging personal data beyond existing observability boundaries, so that compliance and observability PRDs stay aligned.

## Implementation Decisions

### Scope and authority

- ADR 0001 remains the product boundary. Compliance work applies to the supported signed-in solo MVP surfaces: home, sign-in, onboarding quiz, recommendations, profile/settings, age gate, footer/header chrome, and the API routes that persist user data.
- This PRD complements `docs/prds/launch-definition-of-done.md` and `docs/prds/prelaunch-verification.md`. Launch readiness should treat missing privacy policy, missing accessibility statement, and missing account-deletion path for Beerolog data as launch blockers once this PRD is approved.
- Final legal text must be reviewed by qualified counsel before production. Engineering delivers structure, localization plumbing, and technically accurate data-inventory content; counsel approves wording.

### Modules to build or modify

| Module | Responsibility |
| --- | --- |
| **Legal content registry** | Deep module: single source for policy page slugs, cookie definitions, processor list metadata, and i18n keys for legal copy. Shallow UI consumes it. |
| **Legal routes** | Render privacy, terms, cookies, and accessibility pages in Hebrew and English using the active locale with optional language toggle consistent with the rest of the site. |
| **Footer legal links** | Surface links to all legal pages from the shared footer without layout shift across RTL/LTR. |
| **Cookie notice** | Lightweight banner or footer-linked notice on first visit disclosing essential/functional cookies; no blocking modal for cookies that are already required for age gating. |
| **Settings privacy panel** | Signed-in settings section for export and delete actions with confirmation and plain-language explanation. |
| **Account deletion service (API)** | Authenticated endpoint that deletes the Beerolog `users` row (cascading baseline taste and ratings), then returns a contract the web client uses to complete Clerk sign-out. Clerk account deletion may be delegated to Clerk user self-service where available; Beerolog must at minimum erase Beerolog persistence and revoke the app session. |
| **Data export service (API)** | Authenticated endpoint returning JSON export of Beerolog-stored personal fields for the current user. |
| **Accessibility shell** | Skip-to-main link, main landmark, page titles, and shared focus/landmark conventions in the root layout. |
| **Component accessibility pass** | Targeted fixes in shared UI and feature components: dialogs, quiz controls, recommendation cards, loading states, language switcher, auth controls. |
| **Accessibility tooling** | `eslint-plugin-jsx-a11y` for static checks; `vitest-axe` (or equivalent) on representative route/component tests. |
| **Operator compliance docs** | `docs/ops` checklist for processor DPAs, accessibility coordinator contact, and prelaunch legal/a11y evidence. |

### Personal data inventory (supported MVP)

Beerolog must document the following categories in the privacy policy and operator inventory:

| Data | Stored by | Purpose | Retention |
| --- | --- | --- | --- |
| Clerk user id | Beerolog DB (`users.id`) | Identity key for persistence | Until account deletion |
| Email, display name (if synced) | Beerolog DB | Account metadata | Until account deletion |
| Baseline taste dials, flavor family, novelty affinity | Beerolog DB | Recommendations and persona | Until account deletion |
| Taste embedding vector | Beerolog DB | Similarity matching (internal) | Until account deletion; disclosed but not required in export payload |
| Beer ratings and optional notes | Beerolog DB | History and learning loop | Until account deletion |
| Auth session | Clerk | Sign-in state | Per Clerk retention policy |
| OAuth profile from social provider | Clerk | Authentication | Per Clerk retention policy |
| `age_verified` cookie | Browser | Age gate persistence | ~1 year |
| `lang` cookie | Browser | Locale preference | ~1 year |
| Session intent (vibe, ABV, free text) | Ephemeral at request time in supported MVP | Match for current recommendation request | Not persisted as standalone rows; disclose ephemeral processing |
| OpenAI prompts for embeddings/explanations | Transmitted to OpenAI | Model inference | Per OpenAI enterprise/API terms; no additional Beerolog logging of prompt bodies beyond existing observability rules |

### Cookie classification

| Cookie | Type | Consent posture |
| --- | --- | --- |
| `age_verified` | Strictly necessary / essential | No opt-out while accessing alcohol-related content; disclosed in cookie notice and privacy policy |
| `lang` | Functional | Disclosed; no dark-pattern blocking; does not require the same level of consent as analytics |
| Future analytics/marketing | Non-essential | Must not be set without explicit opt-in once introduced |

### Privacy rights implementation

- **Deletion**: `DELETE /me` or equivalent authenticated contract (name finalized in API design slice) removes the Beerolog user row. Foreign keys already cascade to `user_baseline_taste` and `beer_ratings`. Web UI requires typed confirmation ("delete my account") before calling the API, then signs the user out via Clerk.
- **Export**: `GET /me/export` returns JSON with account fields, baseline taste human-readable fields, and ratings array. Embedding arrays may be omitted from export payload if not human-readable; policy text must still disclose their existence and purpose.
- **Access/correction**: Supported MVP satisfies access via export and correction via existing profile/onboarding edit flows where available; policy must describe support contact for corrections not yet exposed in UI.
- **Clerk boundary**: Privacy policy must state that users may also need to manage auth-provider data through Clerk or the social provider, and Beerolog deletion erases Beerolog persistence, not necessarily the user's Google/Apple/Facebook/Instagram account.

### Accessibility technical bar

- Target: **Israeli Standard SI 5568**, aligned with **WCAG 2.0 Level AA** for the supported solo journey.
- Required route coverage for automated and manual checks: visitor home, age gate, sign-in, onboarding quiz, recommendations (loading, success, error), signed-in home/profile summary, settings privacy panel, and all legal pages.
- Known high-risk areas from current implementation to address in slices:
  - Modal focus trap and viewport-centered positioning for age gate and other dialogs
  - Heading order and single `h1` per page
  - Form labels and error announcements on quiz and session-intent inputs
  - Decorative SVG `aria-hidden` vs informative images
  - Color contrast on amber/neutral brand palette
  - `prefers-reduced-motion` for pulse/scale transitions
  - Clerk-hosted sign-in iframe limitations: document any third-party a11y constraints honestly in the accessibility statement
- Accessibility statement must include: conformance target (WCAG 2.0 AA / SI 5568), preparation date, known gaps if any, coordinator name/role, contact email, and last review date.

### Internationalization

- All legal and compliance UI strings live in the existing i18n system (`he` and `en`).
- Legal pages must render correctly in RTL and LTR.
- Footer legal links use a stable physical layout pattern (consistent with language switcher pinning) so navigation does not jump between locales.

### Security and logging alignment

- Deletion and export endpoints are authenticated and rate-limited appropriately.
- Compliance actions must not log export payloads, rating notes, or emails in application info logs.
- Align with `docs/prds/observability-and-failure-handling.md`: request IDs yes, personal data in logs no.

### Relationship to alcohol regulations

- Age verification remains separate from cookie consent but must be cross-linked in privacy and terms copy.
- Responsible-drinking footer disclaimer remains; terms should reinforce 18+ audience and no sale of alcohol.

## Testing Decisions

- A good test for this PRD validates externally visible compliance behavior: policies are reachable, cookies are disclosed, deletion removes Beerolog persistence, export returns expected user data, and accessibility checks pass on supported routes.
- **Legal routes**: render tests confirming each slug returns 200, correct `lang`/`dir`, and expected heading/title for Hebrew and English.
- **Cookie registry**: unit tests that cookie definitions include name, purpose, duration, and classification for every cookie Beerolog sets today.
- **Account deletion API**: route tests proving authenticated deletion removes `users`, `user_baseline_taste`, and `beer_ratings` for that user and returns unauthorized for missing/invalid auth. Prior art: existing authenticated route tests in `apps/api/tests/`.
- **Data export API**: route tests proving export shape includes account metadata, baseline taste fields, and ratings; proves 401 without auth.
- **Settings UI**: component tests for confirm dialog, disabled state while deleting, and success sign-out handoff (mock Clerk and API).
- **Accessibility automation**: `vitest-axe` tests on rendered visitor home, age gate open state, and recommendations success state with zero critical violations as CI gate; document exceptions that require manual review (e.g., Clerk iframe).
- **eslint-plugin-jsx-a11y**: add to web lint pipeline; treat violations on supported routes as fix-or-waive before launch.
- **Manual prelaunch checklist** (added to ops checklists): keyboard-only path through sign-in → quiz → recommendations; screen-reader spot check on age gate and onboarding; zoom to 200% without loss of content; verify legal links and accessibility statement contact open correctly.

Prior art: `AgeVerificationGate.test.tsx` for dialog behavior; API route tests for auth boundaries; `@testing-library/react` setup in `apps/web`.

## Out of Scope

- Formal legal advice, counsel engagement, or guaranteed regulatory certification
- GDPR representative appointment mechanics and EU-specific filing work
- Israel Privacy Protection Authority database registration determination (flag for counsel)
- Native mobile apps or venue operator dashboards
- Accessibility conformance for deferred venue, scan, group, challenge, leaderboard, badge, and social surfaces
- WCAG AAA or WCAG 2.2 as the launch target (may be a follow-on uplift)
- Cookie consent management platform (CMP) vendor integration while no non-essential cookies exist
- Marketing email, push notifications, or newsletter compliance
- Full WCAG audit by an external certified auditor (recommended before public marketing scale, not required to implement this PRD)
- Changing recommendation logic, taste model, or auth provider
- Analytics SDK integration (blocked until opt-in posture exists)

## Further Notes

### Suggested vertical slices (for `/to-issues`)

1. Legal content registry + footer links + static legal routes (privacy, terms, cookies, accessibility shell pages)
2. Cookie notice and cookie policy content wired to registry
3. API + settings UI for account deletion
4. API + settings UI for data export
5. Accessibility shell (skip link, landmarks, titles, reduced motion)
6. Component accessibility pass (dialogs, quiz, recommendations, loading/error states)
7. Automated a11y lint/tests in CI
8. Operator docs: processor/DPA checklist, prelaunch compliance evidence template
9. Launch-gate updates cross-referencing this PRD in prelaunch verification

### Counsel review checkpoint

Stop for human legal review after slice 1 draft copy is in place and before production launch. Engineering should mark policy pages as draft until counsel approves.

### Clerk and third-party accessibility

Clerk's sign-in UI is a third-party embed. Beerolog should document known limitations in the accessibility statement and track Clerk's accessibility documentation; full control of provider UI is out of scope.

### ADR follow-on

If this PRD is approved, add `docs/adr/0004-compliance-privacy-and-accessibility.md` capturing the launch compliance boundary and cookie posture so later analytics or social features do not erode it without an explicit decision.

### Current intended status

`ready-for-human` — PRD drafted; awaiting product owner approval before `/to-issues` publishes execution slices.
