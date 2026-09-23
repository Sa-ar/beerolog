import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, type Locator, type Page } from '@playwright/test'
import { appPath } from '../src/lib/app-path'
import {
  AGE_CONFIRM_NAME,
  CLERK_LOADED_BUDGET_MS,
  CONTINUE_OR_SIGN_IN_NAME,
  GUEST_STORAGE_KEYS,
  IDENTIFIER_FIELD_NAME,
  OTP_FIELD_NAME,
  PASSWORD_FIELD_NAME,
  blockedAutomationPageReason,
  clerkInstanceKind,
  cookieOrigin,
  nextQuizSurfaceAction,
  quizAdvanceAfterPick,
  readClerkPublishableKeyFromHtml,
  sessionCookies,
  shouldInstallClerkTestingToken,
  shouldUseClerkTestingHelpers,
} from '../src/lib/e2e-page-guards'

export { appPath }

// Dev Clerk test user + target URL come from env (apps/web/.env.e2e, gitignored).
export const EMAIL = process.env.E2E_CLERK_EMAIL
export const PASSWORD = process.env.E2E_CLERK_PASSWORD

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

function setupPublishableKey(): string | undefined {
  return process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY
}

export async function prepareBrowser(page: Page): Promise<void> {
  if (
    shouldInstallClerkTestingToken({
      setupKey: setupPublishableKey(),
      baseUrl: BASE_URL,
    })
  ) {
    await setupClerkTestingToken({ page })
  }
  // Skip the age-gate when the cookie binds. Use the exact host — `.vercel.app`
  // is a public suffix and rejects a parent-domain cookie.
  await page.context().addCookies(sessionCookies(cookieOrigin(BASE_URL)))
  await page.addInitScript((keys: readonly string[]) => {
    for (const key of keys) {
      try {
        localStorage.removeItem(key)
      } catch {
        // private mode / quota
      }
    }
    try {
      localStorage.setItem('analytics_consent', 'denied')
    } catch {
      // private mode / quota
    }
  }, GUEST_STORAGE_KEYS)
}

/**
 * The OG-font outage rendered a raw JSON 500 on every route; Vercel SSO / BotID
 * do the same "locator times out for 90s" dance. Fail fast with a real reason.
 */
export async function assertAppLoaded(page: Page): Promise<void> {
  const text = await page.locator('body').innerText()
  const blocked = blockedAutomationPageReason(`${page.url()}\n${text}`)
  expect(blocked, blocked ?? 'deploy returned a blocked/error document').toBeNull()
}

export async function dismissAgeGate(page: Page): Promise<void> {
  const confirm = page
    .getByTestId('age-gate-confirm')
    .or(page.getByRole('button', { name: AGE_CONFIRM_NAME }))
  if (await confirm.first().isVisible().catch(() => false)) {
    await confirm.first().click()
  }
}

async function firstVisible(
  page: Page,
  candidates: Locator[],
  timeoutMs = 20_000,
): Promise<Locator> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    for (const locator of candidates) {
      const handle = locator.first()
      if (await handle.isVisible().catch(() => false)) return handle
    }
    await page.waitForTimeout(200)
  }
  throw new Error(
    `none of the expected fields rendered in ${timeoutMs}ms (url=${page.url()})`,
  )
}

function identifierFields(root: Page) {
  return [
    root.getByTestId('auth-email'),
    root.getByRole('textbox', { name: IDENTIFIER_FIELD_NAME }),
    root.locator('input[name="identifier"]'),
    root.locator('input[autocomplete="email"]'),
    root.locator('input[type="email"]'),
  ]
}

function passwordFields(root: Page) {
  return [
    root.getByTestId('auth-password'),
    root.getByLabel(PASSWORD_FIELD_NAME),
    root.locator('input[name="password"]'),
    root.locator('input[type="password"]'),
  ]
}

/**
 * Custom /signin (Email + Password + התחברות) and Clerk hosted identifier-first
 * UI (textbox named "Email address", then Continue, then password).
 */
export async function completePasswordSignIn(page: Page): Promise<void> {
  await dismissAgeGate(page)

  const identifier = await firstVisible(page, identifierFields(page))
  await identifier.fill(EMAIL as string)

  const passwordVisible = async () => {
    for (const locator of passwordFields(page)) {
      if (await locator.first().isVisible().catch(() => false)) return locator.first()
    }
    return null
  }

  let password = await passwordVisible()
  if (!password) {
    await page.getByRole('button', { name: CONTINUE_OR_SIGN_IN_NAME }).click()
    password = await firstVisible(page, passwordFields(page))
  }
  await password.fill(PASSWORD as string)
  await page.getByRole('button', { name: CONTINUE_OR_SIGN_IN_NAME }).click()

  // New-device verification: +clerk_test accepts 424242.
  const codeInput = page
    .getByLabel(OTP_FIELD_NAME)
    .or(page.locator('input[autocomplete="one-time-code"]'))
  if (await codeInput.first().waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) {
    await codeInput.first().fill('424242')
    await page.getByRole('button', { name: CONTINUE_OR_SIGN_IN_NAME }).click()
  }
  await page.waitForURL((url) => !appPath(url).includes('/signin'))
}

async function waitForWindowClerk(page: Page, timeoutMs: number): Promise<boolean> {
  try {
    await page.waitForFunction(() => {
      const clerkGlobal = (window as unknown as { Clerk?: { loaded?: boolean } }).Clerk
      return Boolean(clerkGlobal)
    }, { timeout: timeoutMs })
    return true
  } catch {
    return false
  }
}

/**
 * Sign in without a 90s clerk.loaded() hang. Testing helpers run only against
 * a development Clerk instance; otherwise (or if Clerk never hydrates) fall
 * back to the visible /signin form.
 */
export async function signInWithClerkHelper(page: Page, next = '/'): Promise<void> {
  await openSignIn(page, next)
  const pageKey = readClerkPublishableKeyFromHtml(await page.content())
  const setupKey = setupPublishableKey()
  if (shouldUseClerkTestingHelpers({ pageKey, setupKey })) {
    const hydrated = await waitForWindowClerk(page, CLERK_LOADED_BUDGET_MS)
    if (hydrated) {
      try {
        const secretKind = clerkInstanceKind(process.env.CLERK_SECRET_KEY)
        if (secretKind === 'development') {
          await clerk.signIn({ page, emailAddress: EMAIL as string })
        } else {
          await clerk.signIn({
            page,
            signInParams: {
              strategy: 'password',
              identifier: EMAIL as string,
              password: PASSWORD as string,
            },
          })
        }
        return
      } catch {
        // Hosted UI / token mismatch — use the visible form.
      }
    }
  }
  await completePasswordSignIn(page)
}

export async function openSignIn(page: Page, next = '/'): Promise<void> {
  await page.goto(`/signin/$?next=${encodeURIComponent(next)}`)
  await assertAppLoaded(page)
  await dismissAgeGate(page)
}

export async function pickQuizOption(page: Page, value: string): Promise<void> {
  await dismissAgeGate(page)
  const byTestId = page.getByTestId(`quiz-option-${value}`)
  const byValue = page.locator(`label:has([data-value="${value}"])`)
  const option = (await byTestId.isVisible().catch(() => false)) ? byTestId : byValue
  if (!(await option.isVisible().catch(() => false))) {
    const visible = await page.locator('[data-value]').evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-value')),
    )
    throw new Error(
      `quiz option "${value}" not found (age-gate/BotID/first-question drift?). visible=${JSON.stringify(visible)} url=${page.url()}`,
    )
  }
  await option.click()
}

type QuizThereafter = { option: string } | { testId: string }

function thereafterLocator(page: Page, thereafter: QuizThereafter): Locator {
  return 'option' in thereafter
    ? page
        .getByTestId(`quiz-option-${thereafter.option}`)
        .or(page.locator(`label:has([data-value="${thereafter.option}"])`))
    : page.getByTestId(thereafter.testId)
}

/** First-pass pick: auto-advance when the pointer path fires; otherwise
 *  commit via the explicit Next that keyboard / detail-0 clicks show. */
export async function pickQuizOptionAndAdvance(
  page: Page,
  value: string,
  thereafter: QuizThereafter,
): Promise<void> {
  await pickQuizOption(page, value)
  const target = thereafterLocator(page, thereafter)
  const next = page.getByTestId('quiz-next')
  await Promise.race([
    target.waitFor({ state: 'visible', timeout: 8_000 }),
    next.waitFor({ state: 'visible', timeout: 8_000 }),
  ]).catch(() => undefined)
  const action = quizAdvanceAfterPick({
    pickedStillVisible: await page
      .getByTestId(`quiz-option-${value}`)
      .or(page.locator(`label:has([data-value="${value}"])`))
      .isVisible()
      .catch(() => false),
    nextButtonVisible: await next.isVisible().catch(() => false),
  })
  if (action === 'click-next') await next.click()
  await expect(target).toBeVisible()
}

export async function ensureQuizQuestionVisible(page: Page): Promise<void> {
  const deadline = Date.now() + 20_000
  let lastAction = 'wait'
  while (Date.now() < deadline) {
    const text = await page.locator('body').innerText().catch(() => '')
    const blocked = blockedAutomationPageReason(`${page.url()}\n${text}`)
    const ageGate = page
      .getByTestId('age-gate-confirm')
      .or(page.getByRole('button', { name: AGE_CONFIRM_NAME }))
    const retake = page.getByTestId('try-retake')
    const question = page.getByTestId('quiz-question')
    const action = nextQuizSurfaceAction({
      blockedReason: blocked,
      quizQuestionVisible: await question.isVisible().catch(() => false),
      ageGateVisible: await ageGate.first().isVisible().catch(() => false),
      retakeVisible: await retake.isVisible().catch(() => false),
    })
    lastAction = action
    switch (action) {
      case 'blocked':
        throw new Error(blocked ?? 'blocked automation page')
      case 'dismiss-age-gate':
        await ageGate.first().click()
        continue
      case 'retake':
        await retake.click()
        continue
      case 'ready':
        return
      case 'wait':
        await page.waitForTimeout(200)
        continue
      default: {
        const _exhaustive: never = action
        throw new Error(String(_exhaustive))
      }
    }
  }
  const visible = await page
    .locator('[data-value]')
    .evaluateAll((els) => els.map((el) => el.getAttribute('data-value')))
    .catch(() => [])
  throw new Error(
    `quiz-question never became visible (last=${lastAction} url=${page.url()} values=${JSON.stringify(visible)})`,
  )
}

export async function walkAdaptiveQuiz(page: Page): Promise<void> {
  await ensureQuizQuestionVisible(page)

  // Coffee "with milk" is ambiguous → the dark-chocolate confirm branch appears.
  // First-pass may auto-advance (pointer) or require Next (detail-0 click).
  await pickQuizOptionAndAdvance(page, 'milk_based', { option: 'dark_70' })
  await pickQuizOptionAndAdvance(page, 'dark_70', { option: 'some' })

  // Back revisits the previous answer (prefilled, not removed); confirming a
  // revisit is explicit, so re-pick then Next to advance.
  await page.getByTestId('quiz-back').click()
  await expect(
    page.getByTestId('quiz-option-dark_70').or(page.locator('label:has([data-value="dark_70"])')),
  ).toBeVisible()
  await pickQuizOption(page, 'dark_70')
  await page.getByTestId('quiz-next').click()

  await pickQuizOptionAndAdvance(page, 'some', { option: 'strong' })
  await pickQuizOptionAndAdvance(page, 'strong', { option: 'rich' })
  await pickQuizOptionAndAdvance(page, 'rich', { option: 'neutral' })
  await pickQuizOptionAndAdvance(page, 'neutral', { option: 'medium' })
  await pickQuizOptionAndAdvance(page, 'medium', { option: 'love' })
  await pickQuizOptionAndAdvance(page, 'love', { option: 'bright' })
  await pickQuizOptionAndAdvance(page, 'bright', { option: 'okay' })
  await pickQuizOptionAndAdvance(page, 'okay', { option: 'high' })
  await pickQuizOptionAndAdvance(page, 'high', { testId: 'quiz-skip' })

  await page.getByTestId('quiz-skip').click()
  await expect(page.getByTestId('quiz-submit')).toBeVisible()
  await page.getByTestId('quiz-submit').click()
}
