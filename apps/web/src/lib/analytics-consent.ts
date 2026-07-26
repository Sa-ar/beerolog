// Explicit opt-in consent for PostHog analytics + session replay. Stored in
// localStorage (client-only; PostHog init is client-only too). `null` = no
// decision yet → the consent banner shows and PostHog stays dormant.
const CONSENT_KEY = 'analytics_consent'

export type AnalyticsConsent = 'granted' | 'denied'

export function getAnalyticsConsent(): AnalyticsConsent | null {
  if (typeof localStorage === 'undefined') return null
  const v = localStorage.getItem(CONSENT_KEY)
  return v === 'granted' || v === 'denied' ? v : null
}

export function hasAnalyticsConsent(): boolean {
  return getAnalyticsConsent() === 'granted'
}

export function writeAnalyticsConsent(consent: AnalyticsConsent): void {
  if (typeof localStorage !== 'undefined') localStorage.setItem(CONSENT_KEY, consent)
}
