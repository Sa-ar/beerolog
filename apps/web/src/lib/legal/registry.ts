export const LEGAL_SLUGS = ['privacy', 'terms', 'cookies', 'accessibility'] as const

export type LegalSlug = (typeof LEGAL_SLUGS)[number]
