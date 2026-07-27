# Incident: prod + staging down — @vercel/og font crash (2026-07-28)

## Impact
`beerolog.com` (prod) and staging returned **HTTP 500 on every route** (`/`,
`/try`, `/onboarding`, even favicon). The body was
`{"status":500,"unhandled":true,"message":"HTTPError"}`. The staging onboarding
e2e had been red for ~weeks as a result — the canary was there but ignored.

## Root cause
`apps/web/src/routes/api.og.taste.$key.tsx` imported `ImageResponse` from
`@vercel/og` **at module top level**. `@vercel/og` reads its bundled default font
(`Geist-Regular.ttf`) via `readFileSync` at module load. The vite / Nitro
`preset: 'vercel'` build never emits that `.ttf` into the serverless function, so
the read `ENOENT`d. Because it runs at import (`loadEntries`), the whole SSR
entry failed to load → every route 500'd, not just the OG endpoint.

## Fix (PR #315)
Defer `@vercel/og` to a dynamic `import()` inside the handler, with a soft-fail
503. It's now code-split out of the SSR-entry graph, so the app loads; only
`/api/og/taste/*` degrades (503) until the font is bundled.

## Why CI didn't catch it
- `tsc` + unit tests pass (no runtime SSR).
- The CI `pnpm build` (added same day) **succeeds** — the crash is at RUNTIME, not
  build time. **A green build ≠ a working deploy.**
- The staging e2e DID catch it (red for weeks) but the signal was ignored, and
  its 90s locator-timeout failure didn't obviously say "the app is 500ing."

## Lessons
- **Module-load side effects are dangerous in SSR.** A `readFileSync` / asset read
  at import can crash the entire server entry. Keep such imports dynamic + fail soft.
- **A green build does not mean the deploy works.** Add a post-deploy smoke check
  (curl the deployed `/` for 200) — the strongest guard against runtime-only breakage.
- **Never tolerate a persistently-red staging/e2e pipeline.** Weeks of red masked a
  real prod outage. Red staging = treat as possible prod breakage.
- Make e2e fail fast + legibly: assert the page isn't a raw 500 body right after
  navigation instead of waiting 90s for a locator.

## Follow-up
- Bundle the OG font so `/api/og/taste/*` works again (GitHub issue filed).
