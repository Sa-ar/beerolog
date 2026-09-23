/**
 * Pure helpers shared by Playwright e2e setup. Kept out of `e2e/` so vitest
 * can cover the detection / cookie / ready-state logic without spinning a browser.
 */

export const IDENTIFIER_FIELD_NAME =
  /email address|email|אימייל|כתובת דוא|identifier/i
export const PASSWORD_FIELD_NAME = /password|סיסמ/i
export const CONTINUE_OR_SIGN_IN_NAME = /^(Continue|Sign in|המשך|התחברות)$/i
export const AGE_CONFIRM_NAME = /I am 18|אני בן/
export const OTP_FIELD_NAME = /verification code|one-time|קוד אימות/i

export const GUEST_STORAGE_KEYS = ['beerolog:guest_answers', 'beerolog_try_quiz'] as const

/** Short budget: never let clerk.loaded eat the 90s Playwright test timeout. */
export const CLERK_LOADED_BUDGET_MS = 8_000

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

export type ClerkInstanceKind = 'development' | 'production' | 'unknown'

export function clerkInstanceKind(key: string | null | undefined): ClerkInstanceKind {
  if (!key) return 'unknown'
  if (key.startsWith('pk_test_') || key.startsWith('sk_test_')) return 'development'
  if (key.startsWith('pk_live_') || key.startsWith('sk_live_')) return 'production'
  return 'unknown'
}

export function readClerkPublishableKeyFromHtml(html: string): string | null {
  const fromInit = html.match(/"__publishableKey":"(pk_(?:test|live)_[^"]+)"/)
  if (fromInit?.[1]) return fromInit[1]
  const loose = html.match(/pk_(?:test|live)_[A-Za-z0-9]+/)
  return loose?.[0] ?? null
}

const PRODUCTION_CLERK_HOSTS = new Set(['beerolog.com', 'www.beerolog.com', 'beerolog.vercel.app'])

export function hostLooksLikeProductionClerk(baseUrl: string): boolean {
  try {
    return PRODUCTION_CLERK_HOSTS.has(new URL(baseUrl).hostname)
  } catch {
    return false
  }
}

/**
 * Testing Tokens + clerk.signIn from `@clerk/testing` only work on development
 * instances. A pk_test token injected into a pk_live page (beerolog.vercel.app)
 * is the hang that made clerk.loaded() sit for 90s.
 */
export function shouldUseClerkTestingHelpers(opts: {
  pageKey?: string | null | undefined
  setupKey?: string | null | undefined
}): boolean {
  const page = clerkInstanceKind(opts.pageKey)
  const setup = clerkInstanceKind(opts.setupKey)
  if (page === 'production' || setup === 'production') return false
  if (setup !== 'development') return false
  return !opts.pageKey || page === 'development'
}

export function shouldInstallClerkTestingToken(opts: {
  setupKey?: string | null | undefined
  baseUrl?: string | null | undefined
}): boolean {
  if (opts.baseUrl && hostLooksLikeProductionClerk(opts.baseUrl)) return false
  return shouldUseClerkTestingHelpers({ setupKey: opts.setupKey })
}

export type QuizSurfaceAction = 'blocked' | 'dismiss-age-gate' | 'retake' | 'ready' | 'wait'

export function nextQuizSurfaceAction(state: {
  blockedReason: string | null
  quizQuestionVisible: boolean
  ageGateVisible: boolean
  retakeVisible: boolean
}): QuizSurfaceAction {
  if (state.blockedReason) return 'blocked'
  // Modal marks the quiz inert — dismiss before asserting quiz-question visible.
  if (state.ageGateVisible) return 'dismiss-age-gate'
  if (state.retakeVisible) return 'retake'
  if (state.quizQuestionVisible) return 'ready'
  return 'wait'
}
