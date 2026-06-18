# Slice #77 — session UX + why-lines (web)

## What ships in this PR

- `/session-intent` route — two-pick quick-form (vibe + ABV intent) plus
  an optional Hebrew/English free-text box. Posts to
  `/api/recommendations` with a placeholder baseline (the slice/74
  matcher accepts dials inline), stores the response in `sessionStorage`,
  and routes to `/recommendations`.
- `/recommendations` route — 5-card results page. Reads the last
  payload from `sessionStorage`. Each card shows name, brewery, style,
  ABV, market-tier badge, and the why-line from the API. A toggle
  reveals the full score breakdown for debugging.
- Component contract tests for `/session-intent` covering the four
  vibe options, the four ABV options, the Hebrew-friendly free-text
  affordance, and the submit-disabled-until-valid behaviour.

## What's HITL and explicitly out of scope here

- **Hebrew copy across the whole flow** — the page is currently
  English-only. A native Hebrew speaker should write the strings
  (vibe labels, ABV labels, placeholder, button text, error messages).
- **Design polish** — the page uses raw inline styles for fast scaffolding.
  Replace with the project's design system once one exists.
- **Replace the placeholder baseline** — the page currently hard-codes a
  hop-head profile. Once slice #76's onboarding flow is wired to the
  web, this should pull `GET /me/baseline-taste` instead.
- **Replace `/results`** (pre-pivot route) — the old route is dead code.
  Drop it (and `/quiz`, `lib/menu-context.ts`, etc.) in a cleanup PR
  after the new flow is the default.
- **API client regen** — the page uses raw `fetch` against
  `/api/recommendations` because regenerating `api-client/schema.d.ts`
  requires a running API. Track as a follow-up.
- **Auth wiring** — the page currently does not send a Clerk bearer.
  Wire it in once the smoke test is repointed to the real auth flow.

## Acceptance criteria status (from issue)

- [x] User completes session intent in ≤10 seconds (3 inputs, last optional)
- [x] Five cards render with all fields populated, including a why-line
- [x] Hebrew free-text flows into the SessionIntent composer (server-side; covered by slice/74)
- [x] Skip-session-intent path — covered by slice/74's `null` SessionIntent fallback (UI button is HITL)
- [x] Why-line module unit tests — already in slice/74
- [x] Score breakdown is included in API response and accessible from the UI (devtools toggle)
- [ ] **Hebrew copy across the whole flow** (HITL)
