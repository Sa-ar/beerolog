import { setupClerkTestingToken } from '@clerk/testing/playwright'
import { test, expect, type Page } from '@playwright/test'

// Dev Clerk test user + target URL come from env (apps/web/.env.e2e, gitignored).
const EMAIL = process.env.E2E_CLERK_EMAIL
const PASSWORD = process.env.E2E_CLERK_PASSWORD

// The guest funnel is unlocked-to-3 by default (server-driven via unlocked_count).
const UNLOCKED_COUNT = 3

// Each quiz option carries data-value = the wire enum value (language-agnostic).
// The input is sr-only; click the enclosing label like a real user would.
async function pick(page: Page, value: string) {
  await page.locator(`label:has([data-value="${value}"])`).click()
}

// Walk the full adaptive quiz with the same picks the onboarding spec uses.
// Reused verbatim so the guest path exercises the identical question graph.
async function walkQuiz(page: Page) {
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

  // Finish; /try swaps the quiz for the guest results view.
  await page.getByTestId('quiz-submit').click()
}

// Sign IN the existing +clerk_test user through our custom /signin page. The
// e2e reuses an already-registered email (E2E_CLERK_EMAIL), so signing UP would
// fail; the funnel still lands a returning user on /recommendations via the
// signed-in hydration branch. Mirrors onboarding.spec's proven sign-in flow:
// navigate to /signin with next=/recommendations, email + password, then the
// new-device email code (424242 for +clerk_test) into the one-time-code input,
// and wait to leave /signin.
async function signInExistingUser(page: Page) {
  await page.goto('/signin/$?next=/recommendations')
  await page.locator('input[type="email"]').fill(EMAIL as string)
  await page.locator('input[type="password"]').fill(PASSWORD as string)
  await page.locator('form button[type="submit"]').click()
  // New-device verification: dev Clerk emails a code; +clerk_test accepts 424242.
  const codeInput = page.locator('input[autocomplete="one-time-code"]')
  if (await codeInput.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false)) {
    await codeInput.fill('424242')
    await page.locator('form button[type="submit"]').click()
  }
  // On success the signin page navigates to `next` (/recommendations).
  await page.waitForURL((url) => !url.pathname.includes('/signin'))
}

test('guest takes the quiz, hits the 3-result gate, signs in, and lands on full recommendations', async ({
  page,
}) => {
  test.skip(!EMAIL || !PASSWORD, 'Set E2E_CLERK_EMAIL / E2E_CLERK_PASSWORD in .env.e2e')
  // In CI a real dev target is required; localhost won't exist there.
  test.skip(
    !!process.env.CI && !process.env.E2E_BASE_URL,
    'Set the E2E_BASE_URL secret to a dev deployment (dev Clerk + dev API)',
  )

  await setupClerkTestingToken({ page })
  // Skip the non-dismissible age-gate modal that would otherwise overlay the
  // page and block quiz / CTA interaction.
  await page
    .context()
    .addCookies([
      { name: 'age_verified', value: '1', url: process.env.E2E_BASE_URL ?? 'http://localhost:5173' },
    ])

  // --- Guest funnel: /try, UNAUTHENTICATED, no sign-in first. ---
  await page.goto('/try')
  await walkQuiz(page)

  // The guest results view replaces the quiz once recommendations resolve.
  const visible = page.getByTestId('guest-results-visible')
  await expect(visible).toBeVisible()

  // Gate: exactly `unlocked_count` fully-visible/interactive result cards.
  await expect(visible.getByTestId('guest-beer-card')).toHaveCount(UNLOCKED_COUNT)

  // The remainder are present but blurred + aria-hidden + non-interactive.
  const locked = page.getByTestId('guest-results-locked')
  await expect(locked).toBeAttached()
  await expect(locked).toHaveAttribute('aria-hidden', 'true')
  await expect(locked.getByTestId('guest-beer-card').first()).toBeAttached()

  // The CTA still targets the new-user path: sign-up with next=/recommendations.
  // We assert that target but don't follow it — the e2e reuses an existing
  // (already-registered) account, so we convert via sign-in below instead.
  const cta = page.getByTestId('guest-signup-cta')
  await expect(cta).toBeVisible()
  const href = await cta.getAttribute('href')
  expect(href).toContain('/signup')
  expect(href).toContain('next=%2Frecommendations')

  // --- Convert: sign IN the existing user (not sign-up) with the same
  // next=/recommendations target the CTA advertises. The returning user has a
  // profile, so the signed-in hydration branch lands them on full recs. ---
  await signInExistingUser(page)

  // Payoff: hydration lands the (returning) user on /recommendations.
  await page.waitForURL((url) => url.pathname.endsWith('/recommendations'))

  // Full, unblurred recommendations render: the matched-results heading shows and
  // none of the guest-only locked/CTA gating is present on the authed page.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByTestId('guest-results-locked')).toHaveCount(0)
  await expect(page.getByTestId('guest-signup-cta')).toHaveCount(0)

  // The signed-in hydration branch clears stored guest answers (the returning
  // user already has a profile, so they're discarded rather than re-submitted).
  // Hydration clears asynchronously after GET /me/baseline-taste resolves, so
  // poll rather than reading once.
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('beerolog:guest_answers')), {
      timeout: 15_000,
    })
    .toBeNull()
})

// Placeholder per the PRD testing list: rapid repeated POST /guest-recommendations
// from the same IP should be throttled. Lands when infra rate-limiting does.
test.skip('guest recommendations are rate-limited under rapid repeated requests', async () => {
  // TODO: implement once infrastructure-layer rate limiting is in place for
  // POST /guest-recommendations (deferred to the infra layer per the PRD).
})
