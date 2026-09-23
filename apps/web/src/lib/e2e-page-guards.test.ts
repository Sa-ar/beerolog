import { describe, expect, it } from 'vitest'
import {
  AGE_CONFIRM_NAME,
  CLERK_LOADED_BUDGET_MS,
  CONTINUE_OR_SIGN_IN_NAME,
  IDENTIFIER_FIELD_NAME,
  blockedAutomationPageReason,
  clerkInstanceKind,
  cookieOrigin,
  hostLooksLikeProductionClerk,
  nextQuizSurfaceAction,
  quizAdvanceAfterPick,
  readClerkPublishableKeyFromHtml,
  sessionCookies,
  shouldInstallClerkTestingToken,
  shouldUseClerkTestingHelpers,
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

describe('clerkInstanceKind', () => {
  it('classifies Clerk publishable and secret keys', () => {
    expect(clerkInstanceKind('pk_test_abc')).toBe('development')
    expect(clerkInstanceKind('sk_test_abc')).toBe('development')
    expect(clerkInstanceKind('pk_live_Y2xlcmsuYmVlcm9sb2cuY29tJA')).toBe('production')
    expect(clerkInstanceKind('sk_live_abc')).toBe('production')
    expect(clerkInstanceKind(undefined)).toBe('unknown')
    expect(clerkInstanceKind('not-a-key')).toBe('unknown')
  })
})

describe('readClerkPublishableKeyFromHtml', () => {
  it('reads the SSR __clerk_init_state key used on beerolog.vercel.app', () => {
    const html =
      '<script>window.__clerk_init_state = {"__internal_clerk_state":{"__publishableKey":"pk_live_Y2xlcmsuYmVlcm9sb2cuY29tJA"}}</script>'
    expect(readClerkPublishableKeyFromHtml(html)).toBe('pk_live_Y2xlcmsuYmVlcm9sb2cuY29tJA')
  })
})

describe('shouldUseClerkTestingHelpers', () => {
  it('never uses @clerk/testing against a production page or setup key', () => {
    expect(
      shouldUseClerkTestingHelpers({
        pageKey: 'pk_live_abc',
        setupKey: 'pk_test_abc',
      }),
    ).toBe(false)
    expect(shouldUseClerkTestingHelpers({ setupKey: 'pk_live_abc' })).toBe(false)
  })

  it('allows testing helpers only when both sides are development', () => {
    expect(
      shouldUseClerkTestingHelpers({
        pageKey: 'pk_test_page',
        setupKey: 'pk_test_setup',
      }),
    ).toBe(true)
    expect(shouldUseClerkTestingHelpers({ setupKey: 'pk_test_setup' })).toBe(true)
    expect(shouldUseClerkTestingHelpers({ setupKey: undefined })).toBe(false)
  })
})

describe('shouldInstallClerkTestingToken', () => {
  it('skips the testing token on production aliases even if CI has a pk_test secret', () => {
    expect(
      shouldInstallClerkTestingToken({
        setupKey: 'pk_test_abc',
        baseUrl: 'https://beerolog.vercel.app',
      }),
    ).toBe(false)
    expect(hostLooksLikeProductionClerk('https://www.beerolog.com/try')).toBe(true)
    expect(
      shouldInstallClerkTestingToken({
        setupKey: 'pk_test_abc',
        baseUrl: 'https://beerolog-git-staging-saarstudio.vercel.app',
      }),
    ).toBe(true)
  })
})

describe('quizAdvanceAfterPick', () => {
  it('clicks Next when the pick stayed on the same question (no auto-advance)', () => {
    expect(
      quizAdvanceAfterPick({ pickedStillVisible: true, nextButtonVisible: true }),
    ).toBe('click-next')
  })

  it('does not click Next after a pointer auto-advance remounts the question', () => {
    expect(
      quizAdvanceAfterPick({ pickedStillVisible: false, nextButtonVisible: false }),
    ).toBe('already-advanced')
    expect(
      quizAdvanceAfterPick({ pickedStillVisible: false, nextButtonVisible: true }),
    ).toBe('already-advanced')
  })
})

describe('nextQuizSurfaceAction', () => {
  it('dismisses the age-gate before treating quiz-question as ready', () => {
    expect(
      nextQuizSurfaceAction({
        blockedReason: null,
        quizQuestionVisible: true,
        ageGateVisible: true,
        retakeVisible: false,
      }),
    ).toBe('dismiss-age-gate')
  })

  it('retakes a stored guest session, then waits until the question appears', () => {
    expect(
      nextQuizSurfaceAction({
        blockedReason: null,
        quizQuestionVisible: false,
        ageGateVisible: false,
        retakeVisible: true,
      }),
    ).toBe('retake')
    expect(
      nextQuizSurfaceAction({
        blockedReason: null,
        quizQuestionVisible: true,
        ageGateVisible: false,
        retakeVisible: false,
      }),
    ).toBe('ready')
    expect(
      nextQuizSurfaceAction({
        blockedReason: null,
        quizQuestionVisible: false,
        ageGateVisible: false,
        retakeVisible: false,
      }),
    ).toBe('wait')
  })

  it('fails fast on SSO/BotID instead of waiting for quiz-question', () => {
    expect(
      nextQuizSurfaceAction({
        blockedReason: 'Vercel SSO login intercepted the app',
        quizQuestionVisible: false,
        ageGateVisible: false,
        retakeVisible: false,
      }),
    ).toBe('blocked')
  })
})

describe('CLERK_LOADED_BUDGET_MS', () => {
  it('is far below the 90s Playwright test timeout so a hung Clerk cannot eat the run', () => {
    expect(CLERK_LOADED_BUDGET_MS).toBeGreaterThan(0)
    expect(CLERK_LOADED_BUDGET_MS).toBeLessThan(15_000)
  })
})
