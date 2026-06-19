# Accessibility verification (manual)

Repeatable manual accessibility check for the supported MVP, run before each
release in addition to the automated axe gate (#109). Required by
`docs/prds/compliance-privacy-and-accessibility.md` (SI 5568 / WCAG 2.0 AA).

Run in both Hebrew (RTL) and English (LTR). Record the result in the release
evidence file.

## Prerequisites

- Web + API deployed and reachable
- A test Clerk user available for the target environment
- Keyboard only (no mouse) for section 1; a screen reader for section 2

## 1. Keyboard-only path

Using only Tab / Shift+Tab / Enter / Space / arrow keys:

- [ ] On first Tab from page load, the **Skip to content** link appears and
      jumps focus past the header to the main region
- [ ] Complete sign-in → onboarding quiz → recommendations without a focus trap
- [ ] Quiz options are reachable and selectable; the chosen option is
      announced as selected (radiogroup)
- [ ] Visible focus indicator on every interactive element
- [ ] Footer legal links are reachable and activate

## 2. Screen-reader spot check

- [ ] Onboarding quiz: each question group has a name; form controls announce
      their label and selected state
- [ ] Error states (e.g. failed quiz submit) are announced (role="alert")
- [ ] Decorative imagery (brand mark, illustrations) is not announced
- [ ] Each page exposes a single `h1`

## 3. Zoom / reflow

- [ ] Zoom the browser to 200%: no loss of content and no horizontal scrolling
      on the supported routes

## 4. Legal surfaces

- [ ] `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/accessibility`
      open and render correctly in both `he` (RTL) and `en` (LTR)
- [ ] The accessibility statement contact (coordinator email) is correct
- [ ] The cookie notice appears on first visit and does **not** block use

## Known exceptions

- Clerk's hosted sign-in UI is a third-party embed; note any barriers in the
  accessibility statement rather than treating them as our defects.

## What “green” means

Every box above checked in both languages, and the automated axe gate (#109)
passing. Any unchecked item is a launch blocker unless explicitly waived and
disclosed in the accessibility statement with a remediation timeline.