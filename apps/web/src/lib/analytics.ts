import posthog from 'posthog-js'

// PostHog product analytics for Beerolog. FULL suite (owner decision 2026-07-26):
// autocapture, $pageview, session replay (input-masked), feature flags, exception
// tracking, and persistent cross-session identity via cookies.
//
// ⚠ COMPLIANCE DEBT: this sets analytics cookies + records sessions with NO opt-in
// consent, which the privacy policy requires. Tracked in
// docs/legal/legal-launch-followups.md — resolve before public launch.
let ready = false

export function initAnalytics(): void {
  if (ready || typeof window === 'undefined') return
  const key = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
  if (!key) return // unset in dev/preview — capture() stays a no-op
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: 'history_change',
    capture_exceptions: true, // error / exception tracking
    // Session replay with input VALUES masked (emails, quiz free-text). Text is
    // left visible for UX analysis — add maskTextSelector:'*' for stricter masking.
    disable_session_recording: false,
    session_recording: { maskAllInputs: true },
    // persistence, autocapture, heatmaps, feature flags left at PostHog defaults
    // (on) — the "everything on" posture.
  })
  ready = true
}

// Closed set of growth-loop events + their properties. PostHog has no per-event
// key cap (unlike Vercel custom events), so properties are rich and typed here.
type EventProps = {
  archetype_revealed: { key: string; surface: 'try' | 'home' }
  share_taste: { key: string; method: 'shared' | 'copied'; surface: 'try' | 'home' }
  quiz_start: { surface: 'try' | 'onboarding'; referred: boolean }
  quiz_complete: { surface: 'try' | 'onboarding' }
  cta_click: { key: string; target: 'try' }
}

export function capture<K extends keyof EventProps>(name: K, props: EventProps[K]): void {
  // Self-initialise: React fires a child route's effects before the root
  // layout's, so the first capture() can run before __root's init effect.
  // initAnalytics() is idempotent, so this just guarantees ordering.
  initAnalytics()
  if (!ready) return
  posthog.capture(name, props)
}
