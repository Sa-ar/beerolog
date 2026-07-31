/** Account destinations — desktop sidebar on /account/*, UserMenu everywhere. */
export const ACCOUNT_NAV = [
  { to: '/account/profile', key: 'profile' },
  { to: '/account/collection', key: 'collection' },
  { to: '/account/details', key: 'details' },
  { to: '/account/security', key: 'security' },
  { to: '/account/settings', key: 'settings' },
] as const

export type AccountNavKey = (typeof ACCOUNT_NAV)[number]['key']

export function isAccountPath(pathname: string): boolean {
  return pathname === '/account' || pathname.startsWith('/account/')
}
