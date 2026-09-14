import { test, expect, type Page } from '@playwright/test'
import {
  EMAIL,
  PASSWORD,
  appPath,
  assertAppLoaded,
  completePasswordSignIn,
  prepareBrowser,
} from './helpers'

// /onboarding is auth-gated; signed out it bounces to our custom /signin page
// (ClerkProvider signInUrl='/signin'). Sign in with email + password there.
async function signIn(page: Page) {
  await prepareBrowser(page)
  await page.goto('/onboarding')
  await assertAppLoaded(page)
  await completePasswordSignIn(page)
  // On success the page navigates to `next` (defaults to '/'); then hit onboarding.
  await page.goto('/onboarding')
  await page.waitForURL((url) => appPath(url).endsWith('/onboarding'))
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

  await pick(page, 'some') // direct bitterness anchor
  await pick(page, 'strong') // fizzy or flat → bubbles
  await pick(page, 'rich') // sweet tooth → sweetness/body
  await pick(page, 'neutral') // roasted flavor → roasty
  await pick(page, 'medium') // session strength → abv_affinity
  await pick(page, 'love') // sour → triggers the wild/funky refinement
  await pick(page, 'bright') // sour_wild
  await pick(page, 'okay') // smoked (no extreme avoid → no CATA)
  await pick(page, 'high') // adventurous → novelty

  // Optional capstone flavor-cue grid → skip it.
  await page.getByTestId('quiz-skip').click()

  // Finish; the signed-in home is the Want deck (page-reduction #322/#323).
  // Taste identity (radar + persona) lives on /account/profile, not `/`.
  await page.getByTestId('quiz-submit').click()
  await page.waitForURL((url) => {
    const path = appPath(url)
    return path !== '/onboarding' && !path.includes('/signin')
  })

  await page.goto('/account/profile')
  await page.waitForURL((url) => appPath(url).endsWith('/account/profile'))
  await expect(page.getByTestId('taste-radar')).toBeVisible()
  await expect(page.getByTestId('persona-title')).toBeVisible()
})
