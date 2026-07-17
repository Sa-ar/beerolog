/**
 * Single source of truth for signed-in primary destinations.
 */

import type { CatalogIconGroup } from '@beerolog/icons'

export const SIGNED_IN_NAV = [
  {
    id: 'home',
    to: '/',
    labelKey: 'nav.home',
    iconGroup: 'session.vibe' as const satisfies CatalogIconGroup,
    iconKey: 'refreshing',
    match: (pathname: string) => pathname === '/',
  },
  {
    id: 'scan',
    to: '/menu',
    labelKey: 'nav.scan',
    iconGroup: 'journey' as const satisfies CatalogIconGroup,
    iconKey: 'quiz',
    match: (pathname: string) => pathname.startsWith('/menu'),
  },
  {
    id: 'picks',
    to: '/recommendations',
    labelKey: 'nav.picks',
    iconGroup: 'journey' as const satisfies CatalogIconGroup,
    iconKey: 'picks',
    match: (pathname: string) => pathname.startsWith('/recommendations'),
  },
  {
    id: 'rate',
    to: '/rate',
    labelKey: 'nav.rate',
    iconGroup: 'journey' as const satisfies CatalogIconGroup,
    iconKey: 'quiz',
    match: (pathname: string) => pathname.startsWith('/rate'),
  },
] as const

export type SignedInNavId = (typeof SIGNED_IN_NAV)[number]['id']

export function activeSignedInNavId(pathname: string): SignedInNavId | null {
  for (const item of SIGNED_IN_NAV) {
    if (item.match(pathname)) return item.id
  }
  return null
}
