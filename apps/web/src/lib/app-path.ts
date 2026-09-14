/**
 * Canonicalize a URL path for e2e / waitForURL checks. Trailing slashes
 * (`/onboarding/` vs `/onboarding`) used to fail `pathname.endsWith(...)`.
 */
export function appPath(pathnameOrUrl: string | URL): string {
  const pathname = typeof pathnameOrUrl === 'string' ? pathnameOrUrl : pathnameOrUrl.pathname
  const trimmed = pathname.replace(/\/+$/, '')
  return trimmed === '' ? '/' : trimmed
}
