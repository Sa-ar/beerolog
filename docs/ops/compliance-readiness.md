# Compliance operator readiness

Durable operator artifacts for the launch compliance bar defined in
`docs/prds/compliance-privacy-and-accessibility.md`. This file records the
processor/DPA inventory, the accessibility coordinator, and the prelaunch
legal-evidence template. The repeatable manual accessibility check lives in
`checklists/accessibility-verification.md`.

Never commit live secrets here. “Owner” is the human accountable, not a system.

## 1. Sub-processor & DPA checklist

Every third party that receives personal data must have a signed Data
Processing Agreement (or equivalent addendum) before launch. See the matching
`docs/services/*.md` for configuration details.

| Sub-processor | Purpose | Personal data shared | DPA / DPA addendum | Owner |
| --- | --- | --- | --- | --- |
| Clerk | Authentication & session | Email, display name, OAuth profile | [ ] signed | _pending_ |
| Neon | Database / persistence | All Beerolog-stored data (account, taste profile, ratings) | [ ] signed | _pending_ |
| Vercel | Web + API hosting | Request metadata, IP at the edge | [ ] signed | _pending_ |
| OpenAI | Model inference | Ephemeral session-intent prompts (no additional logging) | [ ] signed (DPA / zero-retention) | _pending_ |

- [ ] Privacy policy (#103) sub-processor list matches this table exactly
- [ ] Determination on Israel Privacy Protection Authority database
      registration obtained from counsel (out of scope of the PRD; flagged)

## 2. Accessibility coordinator

Required by the accessibility statement (SI 5568) and surfaced publicly on
`/legal/accessibility`.

- **Name:** _pending assignment_
- **Role:** _pending_
- **Contact email:** accessibility@beerolog.example _(replace before launch)_
- **Responsibilities:**
  - Triage accessibility feedback from users
  - Keep the accessibility statement (#103) current: conformance target,
    known gaps, remediation timeline, last-review date
  - Track Clerk's hosted sign-in accessibility (third-party embed, outside our
    axe coverage — see #109)
  - Sign off on the manual verification checklist each release

## 3. Prelaunch legal-evidence template

Artifacts to collect and link from the release record
(`docs/ops/releases/<YYYY-MM-DD>-<version>.md`) before go-live:

- [ ] Privacy policy reviewed & approved by qualified counsel; draft banner
      removed from `/legal/privacy` (Note: GDPR requires a full physical address. 
      The controller address is currently set to 'Ramat Gan, Israel (Full physical 
      address available upon request)'. Ensure a P.O. Box or business mailing 
      address in Ramat Gan is obtained and listed before removing the draft banner.)
- [ ] Terms of use approved by counsel; draft banner removed
- [ ] Cookie notice copy approved; classifications match `COOKIE_REGISTRY`
- [ ] Accessibility statement finalized with the real coordinator name/role/email
- [ ] All sub-processor DPAs signed (section 1)
- [ ] Israel database-registration determination recorded
- [ ] Data **export** verified in staging (`GET /me/export` returns the user's
      data; payload not logged)
- [ ] Data **deletion** verified in staging (`DELETE /me` removes
      `users` + `user_baseline_taste` + `beer_ratings`; user signed out)
- [ ] Automated accessibility gate green in CI (#109)
- [ ] Manual accessibility checklist passed (see below)

## What “ready” means

All of section 1 DPAs signed, the coordinator assigned with a real contact,
every section 3 box checked, and the legal pages out of draft. If any one is
missing, compliance is not launch-ready (see the launch gate, #111).