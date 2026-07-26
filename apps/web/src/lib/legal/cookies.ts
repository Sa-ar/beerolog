export const COOKIE_CLASSIFICATIONS = [
  'essential',
  'functional',
  'analytics',
  'marketing',
] as const

export type CookieClassification = (typeof COOKIE_CLASSIFICATIONS)[number]

export interface CookieDefinition {
  name: string
  classification: CookieClassification
  durationDays: number
  // i18n key under `legal.cookies` describing the cookie's purpose.
  purposeKey: string
}

// First-party essential/functional cookies. ⚠ PostHog analytics is now enabled and
// sets analytics cookies (ph_*) + records sessions, which are NOT yet listed here
// and were NOT gated behind opt-in consent. The cookie-notice "no analytics cookies
// without opt-in" claim is inaccurate until that lands — outstanding compliance
// work, see docs/legal/legal-launch-followups.md.
export const COOKIE_REGISTRY: CookieDefinition[] = [
  { name: 'age_verified', classification: 'essential', durationDays: 365, purposeKey: 'ageVerified' },
  { name: 'lang', classification: 'functional', durationDays: 365, purposeKey: 'lang' },
  // Set by Clerk to keep the user signed in; required for authenticated use.
  { name: '__session', classification: 'essential', durationDays: 7, purposeKey: 'clerkSession' },
]
