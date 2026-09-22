/**
 * Pure helpers shared by Playwright e2e setup. Kept out of `e2e/` so vitest
 * can cover the detection / cookie logic without spinning a browser.
 */

export const IDENTIFIER_FIELD_NAME =
  /email address|email|אימייל|כתובת דוא|identifier/i
export const PASSWORD_FIELD_NAME = /password|סיסמ/i
export const CONTINUE_OR_SIGN_IN_NAME = /^(Continue|Sign in|המשך|התחברות)$/i
export const AGE_CONFIRM_NAME = /I am 18|אני בן/
export const OTP_FIELD_NAME = /verification code|one-time|קוד אימות/i

export function cookieOrigin(baseUrl: string): string {
  return new URL(baseUrl).origin
}

export type SessionCookie = {
  name: string
  value: string
  domain: string
  path: '/'
  secure: boolean
  sameSite: 'Lax'
}

// Exact host (not `.vercel.app`) — the public suffix would reject a parent cookie.
export function sessionCookies(origin: string): SessionCookie[] {
  const url = new URL(origin)
  const shared = {
    domain: url.hostname,
    path: '/' as const,
    secure: url.protocol === 'https:',
    sameSite: 'Lax' as const,
  }
  return [
    { name: 'age_verified', value: '1', ...shared },
    // English labels make role/name locators stable; values stay language-agnostic.
    { name: 'lang', value: 'en', ...shared },
  ]
}

const BLOCKED_PAGE: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /vercel\.com\/sso/i, reason: 'Vercel SSO login intercepted the app' },
  {
    pattern: /Authentication Required/i,
    reason: 'Vercel deployment protection page',
  },
  {
    pattern: /BotID|unusual traffic|are you a (human|robot)/i,
    reason: 'BotID or bot-challenge page',
  },
  { pattern: /"unhandled":\s*true/, reason: 'deploy returned a raw error body instead of the app' },
  { pattern: /"status":\s*500/, reason: 'deploy returned a raw HTTP 500 body' },
]

export function blockedAutomationPageReason(text: string): string | null {
  for (const { pattern, reason } of BLOCKED_PAGE) {
    if (pattern.test(text)) return reason
  }
  return null
}
