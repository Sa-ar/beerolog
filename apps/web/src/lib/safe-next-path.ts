/**
 * Guard a post-auth `next` redirect target against open-redirect abuse. Only an
 * in-app, root-relative path is allowed: it must start with a single `/`.
 * Protocol-relative (`//evil.com`) and backslash (`/\evil.com`) forms, which
 * browsers normalize to an external host, and absolute URLs are all rejected.
 * ASCII control chars are rejected too: a tab in `/<TAB>/evil.com` normalizes
 * to `https://evil.com/`, slipping past the prefix checks.
 * Returns the safe path, or null when the value can't be trusted.
 */
// eslint-disable-next-line no-control-regex -- intentionally matching control chars
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/

export function safeNextPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (CONTROL_CHARS.test(value)) return null
  if (!value.startsWith('/')) return null
  if (value.startsWith('//') || value.startsWith('/\\')) return null
  return value
}
