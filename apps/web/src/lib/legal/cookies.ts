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

// Canonical list of every cookie present in the Beerolog experience, including
// essential cookies set by our sign-in provider (Clerk). Analytics/marketing
// cookies are intentionally absent — they must not be set without explicit
// opt-in (see the cookie notice copy).
export const COOKIE_REGISTRY: CookieDefinition[] = [
  { name: 'age_verified', classification: 'essential', durationDays: 365, purposeKey: 'ageVerified' },
  { name: 'lang', classification: 'functional', durationDays: 365, purposeKey: 'lang' },
  // Set by Clerk to keep the user signed in; required for authenticated use.
  { name: '__session', classification: 'essential', durationDays: 7, purposeKey: 'clerkSession' },
]
