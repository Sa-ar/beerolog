import { describe, expect, it } from 'vitest'
import {
  AGE_CONFIRM_NAME,
  CONTINUE_OR_SIGN_IN_NAME,
  IDENTIFIER_FIELD_NAME,
  blockedAutomationPageReason,
  cookieOrigin,
  sessionCookies,
} from './e2e-page-guards'

describe('cookieOrigin', () => {
  it('strips path and trailing slash so Playwright cookies bind to the host', () => {
    expect(cookieOrigin('https://beerolog-git-staging-saarstudio.vercel.app/')).toBe(
      'https://beerolog-git-staging-saarstudio.vercel.app',
    )
  })
})

describe('sessionCookies', () => {
  it('sets age + lang on the exact vercel.app host, not the public suffix', () => {
    const cookies = sessionCookies('https://beerolog-git-staging-saarstudio.vercel.app')
    expect(cookies.map((c) => c.name)).toEqual(['age_verified', 'lang'])
    expect(cookies[0]).toMatchObject({
      value: '1',
      domain: 'beerolog-git-staging-saarstudio.vercel.app',
      path: '/',
      secure: true,
      sameSite: 'Lax',
    })
    expect(cookies[1]?.value).toBe('en')
  })
})

describe('blockedAutomationPageReason', () => {
  it('flags Vercel SSO, BotID, and raw 500 bodies', () => {
    expect(blockedAutomationPageReason('https://vercel.com/sso-api?url=…')).toMatch(/SSO/)
    expect(blockedAutomationPageReason('BotID check in progress')).toMatch(/BotID/)
    expect(blockedAutomationPageReason('{"status":500,"unhandled":true}')).toMatch(/error body/)
  })

  it('lets a normal app document through', () => {
    expect(
      blockedAutomationPageReason('מה הזמנת הקפה הרגילה שלכם? עם חלב'),
    ).toBeNull()
  })
})

describe('locator name regexes', () => {
  it('matches both the custom Hebrew form and Clerk hosted identifier copy', () => {
    expect(IDENTIFIER_FIELD_NAME.test('Email')).toBe(true)
    expect(IDENTIFIER_FIELD_NAME.test('אימייל')).toBe(true)
    expect(IDENTIFIER_FIELD_NAME.test('Email address')).toBe(true)
    expect(CONTINUE_OR_SIGN_IN_NAME.test('Continue with Google')).toBe(false)
    expect(CONTINUE_OR_SIGN_IN_NAME.test('התחברות')).toBe(true)
    expect(AGE_CONFIRM_NAME.test('I am 18 or older')).toBe(true)
    expect(AGE_CONFIRM_NAME.test('אני בן/בת 18 ומעלה')).toBe(true)
  })
})
