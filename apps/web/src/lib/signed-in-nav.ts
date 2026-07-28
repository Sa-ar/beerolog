/**
 * Single source of truth for signed-in primary destinations.
 * Two decks: `What I know` (rate) and `What I want` (home/default).
 */

import type { CatalogIconGroup } from '@beerolog/icons'

export const SIGNED_IN_NAV = [
  {
    id: 'whatIKnow',
    to: '/rate',
    labelKey: 'nav.whatIKnow',
    iconGroup: 'journey' as const satisfies CatalogIconGroup,
    iconKey: 'quiz',
    match: (pathname: string) => pathname.startsWith('/rate'),
  },
  {
    id: 'whatIWant',
    to: '/',
    labelKey: 'nav.whatIWant',
    iconGroup: 'journey' as const satisfies CatalogIconGroup,
    iconKey: 'picks',
    match: (pathname: string) => pathname === '/',
  },
] as const

export type SignedInNavId = (typeof SIGNED_IN_NAV)[number]['id']

export function activeSignedInNavId(pathname: string): SignedInNavId | null {
  for (const item of SIGNED_IN_NAV) {
    if (item.match(pathname)) return item.id
  }
  return null
}
