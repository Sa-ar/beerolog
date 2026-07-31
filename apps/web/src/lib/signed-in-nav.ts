/**
 * Single source of truth for signed-in primary destinations.
 * Decks: `What I know` (rate), `What I want` (home). Plus menu scan.
 */
import type { CatalogIconGroup } from '@beerolog/icons'

export const SIGNED_IN_NAV = [
  {
    id: 'whatIKnow',
    to: '/rate',
    labelKey: 'nav.whatIKnow',
    hintKey: 'nav.whatIKnowHint',
    iconGroup: 'journey' as const satisfies CatalogIconGroup,
    iconKey: 'quiz',
    match: (pathname: string) => pathname.startsWith('/rate'),
  },
  {
    id: 'whatIWant',
    to: '/',
    labelKey: 'nav.whatIWant',
    hintKey: 'nav.whatIWantHint',
    iconGroup: 'journey' as const satisfies CatalogIconGroup,
    iconKey: 'picks',
    match: (pathname: string) => pathname === '/',
  },
  {
    id: 'scan',
    to: '/menu',
    labelKey: 'nav.scan',
    hintKey: 'nav.scanHint',
    iconGroup: 'journey' as const satisfies CatalogIconGroup,
    iconKey: 'scan',
    match: (pathname: string) => pathname.startsWith('/menu'),
  },
] as const

export type SignedInNavId = (typeof SIGNED_IN_NAV)[number]['id']

export function activeSignedInNavId(pathname: string): SignedInNavId | null {
  for (const item of SIGNED_IN_NAV) {
    if (item.match(pathname)) return item.id
  }
  return null
}
