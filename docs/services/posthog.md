# PostHog (growth-loop analytics)

Product analytics, session replay, feature flags + error tracking for Beerolog
(grew out of the [growth-loop PRD](../prds/shareable-taste-archetype.md)). Wrapper:
`apps/web/src/lib/analytics.ts`, initialised from the root layout
(`apps/web/src/routes/__root.tsx`).

## How it's configured

**Full suite (owner decision 2026-07-26).** PostHog defaults are left on: autocapture,
`$pageview` (`capture_pageview: 'history_change'` for SPA route changes), heatmaps,
feature flags, and persistent cross-session identity (localStorage + cookie). Plus
explicitly:

- **Session replay** — `disable_session_recording: false` with
  `session_recording: { maskAllInputs: true }` so input **values** (emails, quiz
  free-text) are masked. Text stays visible for UX analysis; add
  `maskTextSelector: '*'` for stricter masking.
- **Error tracking** — `capture_exceptions: true` (window errors + unhandled rejections).
- **Feature flags** — loaded on init; gate UI with `posthog.isFeatureEnabled(key)` /
  `useFeatureFlagEnabled` (define flags in the PostHog dashboard).

### AI observability (server-side)
`apps/api/app/services/observability.py` wraps `AsyncOpenAI` so OpenAI calls emit
PostHog `$ai_generation` / `$ai_embedding` events. Env-gated on
**`POSTHOG_PROJECT_TOKEN`** + `POSTHOG_HOST` (server env, not `VITE_`; reuse the web
project token). Degrades to the plain client when unset.
- **Wired:** every LLM/embedding caller — `why_explainer`, `persona`,
  `note_analyzer`, `menu_chat`, vision (`menu` route), `embedding_service`, and the
  `icon-service` package (self-contained, env-gated).
- **TODO:** pass `posthog_distinct_id=<user_id>` on `.create()` to tie AI events to
  the product-analytics person (needs the user id threaded down).

### Workflows
Configured in the PostHog dashboard, no app code.

### ⚠ Authorized URLs
Set in PostHog → Settings → Authorized URLs (fixes the "no authorized URLs" warning;
needed for the toolbar + some filters): `http://localhost:3001`, `https://beerolog.com`,
`https://beerolog.vercel.app`.

## Environment variables

| Var | Required | Default | Notes |
|-----|----------|---------|-------|
| `VITE_POSTHOG_PROJECT_TOKEN` | to enable | — | Project API key. **Unset = `capture()` is a no-op**, so dev/preview send nothing. |
| `VITE_POSTHOG_HOST` | no | `https://us.i.posthog.com` | Use `https://eu.i.posthog.com` for the EU cloud. |

## Events (the closed set)

| Event | Properties | Fires when |
|-------|-----------|-----------|
| `archetype_revealed` | `key`, `surface: try\|home` | User sees their named archetype |
| `share_taste` | `key`, `method: shared\|copied`, `surface: try\|home` | A real share happens (native sheet or copy) |
| `quiz_start` | `surface: try\|onboarding`, `referred` | Quiz view opens (`referred` = arrived via a shared `/taste` link) |
| `quiz_complete` | `surface: try\|onboarding` | Quiz answers submitted |
| `cta_click` | `key`, `target: try` | Recipient clicks the CTA on a shared `/taste/{key}` page |

K-factor loop in the PostHog funnel UI: `share_taste` → `cta_click` →
`quiz_start (referred=true)` → `quiz_complete` → `archetype_revealed` → back to
`share_taste`.

## ⚠ Before public launch (compliance debt)

The sub-processor disclosure is landed (`legal.privacy`, both locales). BUT the full
suite now **sets analytics cookies + records real user sessions with no opt-in
consent**, which the privacy policy requires. Outstanding (see
`docs/legal/legal-launch-followups.md`):

1. Add PostHog cookies (`ph_*`) to `apps/web/src/lib/legal/cookies.ts` + notice copy.
2. Wire explicit opt-in consent gating `initAnalytics()` before any cookie/replay fires.
3. Privacy policy: disclose session replay + cookie identity; confirm masking is enough.

Accepted as known debt by the owner 2026-07-26.
