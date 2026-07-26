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

// Cookies present in the Beerolog experience. Analytics cookies (PostHog `ph_*`)
// fire ONLY after explicit opt-in via the consent banner (analytics-consent.ts);
// essential/functional cookies are always set.
export const COOKIE_REGISTRY: CookieDefinition[] = [
  { name: 'age_verified', classification: 'essential', durationDays: 365, purposeKey: 'ageVerified' },
  { name: 'lang', classification: 'functional', durationDays: 365, purposeKey: 'lang' },
  // Set by Clerk to keep the user signed in; required for authenticated use.
  { name: '__session', classification: 'essential', durationDays: 7, purposeKey: 'clerkSession' },
  // PostHog analytics + session replay — set only after opt-in consent.
  { name: 'ph_*_posthog', classification: 'analytics', durationDays: 365, purposeKey: 'posthog' },
]
