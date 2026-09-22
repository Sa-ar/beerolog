import { clerk, setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, type Locator, type Page } from '@playwright/test'
import { appPath } from '../src/lib/app-path'
import {
  AGE_CONFIRM_NAME,
  CONTINUE_OR_SIGN_IN_NAME,
  IDENTIFIER_FIELD_NAME,
  OTP_FIELD_NAME,
  PASSWORD_FIELD_NAME,
  blockedAutomationPageReason,
  cookieOrigin,
  sessionCookies,
} from '../src/lib/e2e-page-guards'

export { appPath }

// Dev Clerk test user + target URL come from env (apps/web/.env.e2e, gitignored).
export const EMAIL = process.env.E2E_CLERK_EMAIL
export const PASSWORD = process.env.E2E_CLERK_PASSWORD

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export async function prepareBrowser(page: Page): Promise<void> {
  await setupClerkTestingToken({ page })
  // Skip the non-dismissible age-gate that otherwise overlays auth + quiz after
  // Clerk hydrates. Bind to the exact host — `.vercel.app` is a public suffix.
  await page.context().addCookies(sessionCookies(cookieOrigin(BASE_URL)))
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
  const confirm = page.getByRole('button', { name: AGE_CONFIRM_NAME })
  if (await confirm.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await confirm.click()
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

/** Ticket/password sign-in that never depends on the visible form. */
export async function signInWithClerkHelper(page: Page): Promise<void> {
  await page.goto('/')
  await assertAppLoaded(page)
  await clerk.loaded({ page })
  if (process.env.CLERK_SECRET_KEY) {
    await clerk.signIn({ page, emailAddress: EMAIL as string })
    return
  }
  await clerk.signIn({
    page,
    signInParams: {
      strategy: 'password',
      identifier: EMAIL as string,
      password: PASSWORD as string,
    },
  })
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

export async function walkAdaptiveQuiz(page: Page): Promise<void> {
  await dismissAgeGate(page)
  const retake = page.getByTestId('try-retake')
  if (await retake.isVisible().catch(() => false)) await retake.click()

  await expect(page.getByTestId('quiz-question')).toBeVisible()

  // Coffee "with milk" is ambiguous → the dark-chocolate confirm branch appears.
  await pickQuizOption(page, 'milk_based')
  await pickQuizOption(page, 'dark_70')

  // Back revisits the previous answer (prefilled, not removed); confirming a
  // revisit is explicit, so re-pick then Next to advance.
  await page.getByTestId('quiz-back').click()
  await expect(
    page.getByTestId('quiz-option-dark_70').or(page.locator('label:has([data-value="dark_70"])')),
  ).toBeVisible()
  await pickQuizOption(page, 'dark_70')
  await page.getByTestId('quiz-next').click()

  await pickQuizOption(page, 'some') // direct bitterness anchor
  await pickQuizOption(page, 'strong') // fizzy or flat → bubbles
  await pickQuizOption(page, 'rich') // sweet tooth → sweetness/body
  await pickQuizOption(page, 'neutral') // roasted flavor → roasty
  await pickQuizOption(page, 'medium') // session strength → abv_affinity
  await pickQuizOption(page, 'love') // sour → triggers the wild/funky refinement
  await pickQuizOption(page, 'bright') // sour_wild
  await pickQuizOption(page, 'okay') // smoked (no extreme avoid → no CATA)
  await pickQuizOption(page, 'high') // adventurous → novelty

  await page.getByTestId('quiz-skip').click()
  await page.getByTestId('quiz-submit').click()
}
