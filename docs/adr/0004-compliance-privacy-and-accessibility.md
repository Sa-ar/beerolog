# ADR 0004: Compliance — privacy and accessibility boundary

- Status: Accepted
- Date: 2026-06-18

## Context

Beerolog is a public, bilingual (he/en) web product that stores signed-in user
data, sets browser cookies, and relies on third-party processors (Clerk, Neon,
Vercel, OpenAI). The repo had no durable bar for GDPR, Israeli privacy law, or
Israeli accessibility law. `docs/prds/compliance-privacy-and-accessibility.md`
defines that bar within the supported solo MVP boundary (ADR 0001); this ADR
records the resulting durable decisions so they are not relitigated per change.

## Decision

- **Legal surfaces.** Privacy policy, terms of use, cookie notice, and an
  accessibility statement live at `/legal/{privacy,terms,cookies,accessibility}`,
  rendered from a single legal content registry in both Hebrew and English, and
  are linked from the footer on every page. Copy is draft until counsel approves.
- **Cookie posture.** Only `age_verified` (strictly necessary) and `lang`
  (functional) are set. Analytics/marketing cookies must not be set without
  explicit opt-in. The canonical list is `COOKIE_REGISTRY`.
- **Data-subject rights over Beerolog-owned data.** Signed-in users can export
  (`GET /me/export`) and permanently delete (`DELETE /me`) the data Beerolog
  stores. Deletion erases `users` + `user_baseline_taste` + `beer_ratings`;
  authentication/session data remains with Clerk and is handled by sign-out.
  The internal taste embedding is disclosed but not exported (not human-readable).
- **Accessibility target.** Israeli Standard SI 5568 (WCAG 2.0 Level AA) across
  the supported sign-in, onboarding, and recommendation flows. Enforced by an
  automated gate (eslint-plugin-jsx-a11y + vitest-axe in CI) plus a repeatable
  manual checklist. Known gaps are disclosed in the accessibility statement.
- **Launch blockers.** Missing privacy policy, missing accessibility statement,
  and missing account-deletion path are launch blockers (see
  `launch-definition-of-done.md` and `prelaunch-verification.md`).

## Consequences

- Legal copy is engineering-owned plumbing plus counsel-owned wording; pages
  stay marked draft until counsel signs off.
- Compliance work stays inside the ADR 0001 boundary — deferred surfaces
  (venue, group, social, leaderboard, badge) are out of scope here.
- Clerk's hosted sign-in is a third-party embed outside our axe coverage; its
  accessibility is tracked and disclosed, not treated as our defect.
- Determination on Israel Privacy Protection Authority database registration is
  deferred to counsel and is not resolved by this ADR.
- Operator evidence (DPAs, coordinator, prelaunch artifacts) lives in
  `docs/ops/compliance-readiness.md`.