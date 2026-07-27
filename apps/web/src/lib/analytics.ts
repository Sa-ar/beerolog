import posthog from 'posthog-js'
import {
  hasAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from './analytics-consent'

// PostHog product analytics for Beerolog. FULL suite (autocapture, $pageview,
// session replay [input-masked], feature flags, exception tracking, cookie
// identity) — GATED on explicit opt-in consent (analytics-consent.ts). Nothing
// initialises and no cookie/recording starts until the user accepts in the
// consent banner (CookieNotice); declining keeps PostHog dormant.
let ready = false
// Deferred identify call: if identifyUser() is called before consent is granted,
// we store the callback and run it once initAnalytics() succeeds.
let pendingIdentify: (() => void) | null = null

export function initAnalytics(): void {
  if (ready || typeof window === 'undefined') return
  if (!hasAnalyticsConsent()) return // opt-in gate: no PostHog until consent
  const key = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
  if (!key) return // unset in dev/preview — capture() stays a no-op
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    ui_host: 'https://eu.posthog.com',
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
  pendingIdentify?.()
  pendingIdentify = null
}

// Called by the consent banner. Grant → initialise now; deny → opt out if PostHog
// is already running (e.g. the user changes their mind mid-session).
export function updateAnalyticsConsent(consent: AnalyticsConsent): void {
  writeAnalyticsConsent(consent)
  if (consent === 'granted') initAnalytics()
  else if (ready) posthog.opt_out_capturing()
}

// Called by the consent banner. Grant → initialise now; deny → opt out if PostHog
// is already running (e.g. the user changes their mind mid-session).
export function updateAnalyticsConsent(consent: AnalyticsConsent): void {
  writeAnalyticsConsent(consent)
  if (consent === 'granted') initAnalytics()
  else if (ready) posthog.opt_out_capturing()
}

// Closed set of growth-loop events + their properties. PostHog has no per-event
// key cap (unlike Vercel custom events), so properties are rich and typed here.
type EventProps = {
  archetype_revealed: { key: string; surface: 'try' | 'home' }
  share_taste: { key: string; method: 'shared' | 'copied'; surface: 'try' | 'home' }
  quiz_start: { surface: 'try' | 'onboarding'; referred: boolean }
  quiz_complete: { surface: 'try' | 'onboarding' }
  cta_click: { key: string; target: 'try' }
  // Signed-in core flows
  session_started: { vibe: string; abv: string; has_free_text: boolean }
  menu_scanned: { has_vibe: boolean; has_free_text: boolean }
  recommendations_loaded: { count: number; has_session: boolean }
  recommendations_shared: { method: 'native' | 'clipboard' }
  recommendations_loaded_more: Record<string, never>
  beer_rated: { rating: string }
  rating_session_complete: { count: number }
  beer_detail_viewed: { beer_id: string; market_tier: string }
}

export function capture<K extends keyof EventProps>(name: K, props: EventProps[K]): void {
  // Self-initialise: React fires a child route's effects before the root
  // layout's, so the first capture() can run before __root's init effect.
  // initAnalytics() is idempotent, so this just guarantees ordering.
  initAnalytics()
  if (!ready) return
  posthog.capture(name, props)
}

// Identify the signed-in user so all events are linked to their account.
// Safe to call before consent: deferred until initAnalytics() succeeds.
// PII (name, email) must only appear here (person properties), never in capture().
export function identifyUser(
  userId: string,
  props: { firstName?: string | null; lastName?: string | null },
): void {
  const doIdentify = () => {
    posthog.identify(userId, {
      ...(props.firstName ? { firstName: props.firstName } : {}),
      ...(props.lastName ? { lastName: props.lastName } : {}),
    })
  }
  if (ready) {
    doIdentify()
  } else {
    pendingIdentify = doIdentify
  }
}

// Call on sign-out to unlink future events from the current user.
export function resetAnalyticsUser(): void {
  pendingIdentify = null
  if (!ready) return
  posthog.reset()
}
