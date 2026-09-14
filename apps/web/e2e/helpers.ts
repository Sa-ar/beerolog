import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { expect, type Page } from '@playwright/test'
import { appPath } from '../src/lib/app-path'

export { appPath }

// Dev Clerk test user + target URL come from env (apps/web/.env.e2e, gitignored).
export const EMAIL = process.env.E2E_CLERK_EMAIL
export const PASSWORD = process.env.E2E_CLERK_PASSWORD

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'

export async function prepareBrowser(page: Page): Promise<void> {
  await setupClerkTestingToken({ page })
  // Skip the non-dismissible age-gate modal that otherwise overlays auth + quiz.
  await page.context().addCookies([{ name: 'age_verified', value: '1', url: BASE_URL }])
}

/**
 * The OG-font outage rendered a raw JSON 500 on every route; the e2e then sat
 * on a locator for 90s. Fail fast when the document is an error body.
 */
export async function assertAppLoaded(page: Page): Promise<void> {
  const text = await page.locator('body').innerText()
  expect(text, 'deploy returned a raw error body instead of the app').not.toMatch(
    /"unhandled":\s*true/,
  )
  expect(text, 'deploy returned a raw HTTP 500 body').not.toMatch(/"status":\s*500/)
}

export async function completePasswordSignIn(page: Page): Promise<void> {
  await page.locator('input[type="email"]').fill(EMAIL as string)
  await page.locator('input[type="password"]').fill(PASSWORD as string)
  await page.locator('form button[type="submit"]').click()
  // New-device verification: dev Clerk emails a code; +clerk_test accepts 424242.
  const codeInput = page.locator('input[autocomplete="one-time-code"]')
  if (await codeInput.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) {
    await codeInput.fill('424242')
    await page.locator('form button[type="submit"]').click()
  }
  await page.waitForURL((url) => !appPath(url).includes('/signin'))
}
