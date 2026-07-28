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

## 5. Swipe decks (page reduction, #329)

Run against `What I want` and `What I know` (ADR 0004 / WCAG 2.5.1, Level A).

- [ ] **Every swipe has an operable on-screen button equivalent** — `What I want`: Pass / Want / Must try; `What I know`: Not for me / It was fine / Loved it. Verified with keyboard only.
- [ ] **Undo** is present and operable on both decks (button, not gesture-only).
- [ ] Swipe controls form a `role="group"` with an accessible name; every control is focusable and Enter/Space-operable.
- [ ] Match % badge and super-like / remove controls expose `aria-label`s; card image is decorative (`alt=""`).
- [ ] **RTL (Hebrew):** swipe direction mirrors on the horizontal axis and the card layout mirrors under `dir="rtl"`.
- [ ] Swipe/persist/scan analytics (`beer_swiped`, `want_to_try_added`, `menu_scan_scoped`) stay dormant until consent is granted.

Automated coverage: `WantDeck.test`, `rate.test`, `decks-a11y.test`,
`swipe-want.test`, `swipe-know.test`, `deferral-guard.test`.

## Known exceptions

- Clerk's hosted sign-in UI is a third-party embed; note any barriers in the
  accessibility statement rather than treating them as our defects.

## What “green” means

Every box above checked in both languages, and the automated axe gate (#109)
passing. Any unchecked item is a launch blocker unless explicitly waived and
disclosed in the accessibility statement with a remediation timeline.