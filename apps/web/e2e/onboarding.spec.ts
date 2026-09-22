import { test, expect, type Page } from '@playwright/test'
import {
  EMAIL,
  PASSWORD,
  appPath,
  prepareBrowser,
  signInWithClerkHelper,
  walkAdaptiveQuiz,
} from './helpers'

// /onboarding is auth-gated. Do not start on the protected route — RedirectToSignIn
// can hang until Clerk loads, or send us to hosted UI without input[type=email].
// Ticket/password sign-in from `/` then open the quiz.
async function signIn(page: Page) {
  await prepareBrowser(page)
  await signInWithClerkHelper(page)
  await page.goto('/onboarding')
  await page.waitForURL((url) => appPath(url).endsWith('/onboarding'))
}

test('signed-in user walks the adaptive quiz and gets a radar + persona', async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_CLERK_EMAIL / E2E_CLERK_PASSWORD in .env.e2e')
  // In CI a real dev target is required; localhost won't exist there.
  test.skip(
    !!process.env.CI && !process.env.E2E_BASE_URL,
    'Set the E2E_BASE_URL secret to a dev deployment (dev Clerk + dev API)',
  )

  await signIn(page)
  await walkAdaptiveQuiz(page)

  await page.waitForURL((url) => {
    const path = appPath(url)
    return path !== '/onboarding' && !path.includes('/signin')
  })

  await page.goto('/account/profile')
  await page.waitForURL((url) => appPath(url).endsWith('/account/profile'))
  await expect(page.getByTestId('taste-radar')).toBeVisible()
  await expect(page.getByTestId('persona-title')).toBeVisible()
})
