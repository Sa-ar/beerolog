import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect, type Page } from '@playwright/test'

// Dev Clerk test user + target URL come from env (apps/web/.env.e2e, gitignored).
const EMAIL = process.env.E2E_CLERK_EMAIL
const PASSWORD = process.env.E2E_CLERK_PASSWORD

// /onboarding is auth-gated; signed out it bounces to our custom /signin page
// (ClerkProvider signInUrl='/signin'). Sign in with email + password there.
async function signIn(page: Page) {
  await setupClerkTestingToken({ page })
  // Skip the non-dismissible age-gate modal (it overlays the in-app /signin
  // page and blocks the submit button). Signed-in users aren't gated anyway.
  await page
    .context()
    .addCookies([
      { name: 'age_verified', value: '1', url: process.env.E2E_BASE_URL ?? 'http://localhost:5173' },
    ])
  await page.goto('/onboarding')
  await page.locator('input[type="email"]').fill(EMAIL as string)
  await page.locator('input[type="password"]').fill(PASSWORD as string)
  await page.locator('form button[type="submit"]').click()
  // New-device verification: dev Clerk emails a code; +clerk_test accepts 424242.
  const codeInput = page.locator('input[autocomplete="one-time-code"]')
  if (await codeInput.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) {
    await codeInput.fill('424242')
    await page.locator('form button[type="submit"]').click()
  }
  // On success the page navigates to `next` (defaults to '/'); then hit onboarding.
  await page.waitForURL((url) => !url.pathname.includes('/signin'))
  await page.goto('/onboarding')
  await page.waitForURL((url) => url.pathname.endsWith('/onboarding'))
}

// Each quiz option carries data-value = the wire enum value (language-agnostic).
// The input is sr-only; click the enclosing label like a real user would.
async function pick(page: Page, value: string) {
  await page.locator(`label:has([data-value="${value}"])`).click()
}

test('signed-in user walks the adaptive quiz and gets a radar + persona', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_CLERK_EMAIL / E2E_CLERK_PASSWORD in .env.e2e')
  // In CI a real dev target is required; localhost won't exist there.
  test.skip(
    !!process.env.CI && !process.env.E2E_BASE_URL,
    'Set the E2E_BASE_URL secret to a dev deployment (dev Clerk + dev API)',
  )

  await signIn(page)

  // Coffee "with milk" is ambiguous → the dark-chocolate confirm branch appears.
  await pick(page, 'milk_based')
  await pick(page, 'dark_70')

  // Back revisits the previous answer (prefilled, not removed); confirming a
  // revisit is explicit, so re-pick then Next to advance.
  await page.getByTestId('quiz-back').click()
  await expect(page.locator('label:has([data-value="dark_70"])')).toBeVisible()
  await pick(page, 'dark_70')
  await page.getByTestId('quiz-next').click()

  await pick(page, 'strong') // fizzy or flat → bubbles
  await pick(page, 'rich') // sweet tooth → sweetness/body
  await pick(page, 'medium') // session strength → abv_affinity
  await pick(page, 'love') // sour → triggers the wild/funky refinement
  await pick(page, 'bright') // sour_wild
  await pick(page, 'okay') // smoked (no extreme avoid → no CATA)
  await pick(page, 'high') // adventurous → novelty

  // Optional capstone flavor-cue grid → skip it.
  await page.getByTestId('quiz-skip').click()

  // Finish and land back on the home profile.
  await page.getByTestId('quiz-submit').click()
  await page.waitForURL((url) => !url.pathname.includes('/onboarding'))

  // Payoff: the 8-axis radar and the LLM persona render.
  await expect(page.getByTestId('taste-radar')).toBeVisible()
  await expect(page.getByTestId('persona-title')).toBeVisible()
})
