import { test, expect, type Page } from '@playwright/test'
import {
  EMAIL,
  PASSWORD,
  appPath,
  assertAppLoaded,
  completePasswordSignIn,
  dismissAgeGate,
  openSignIn,
  prepareBrowser,
  walkAdaptiveQuiz,
} from './helpers'

// The guest funnel is unlocked-to-3 by default (server-driven via unlocked_count).
const UNLOCKED_COUNT = 3

// Sign IN the existing +clerk_test user through our custom /signin page. The
// e2e reuses an already-registered email (E2E_CLERK_EMAIL), so signing UP would
// fail; the funnel still lands a returning user on /recommendations via the
// signed-in hydration branch.
async function signInExistingUser(page: Page) {
  await openSignIn(page, '/recommendations')
  await completePasswordSignIn(page)
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

  await prepareBrowser(page)

  // --- Guest funnel: /try, UNAUTHENTICATED, no sign-in first. ---
  await page.goto('/try')
  await assertAppLoaded(page)
  await dismissAgeGate(page)
  await walkAdaptiveQuiz(page)

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
  // Trailing-slash hosts (`/recommendations/`) used to fail endsWith().
  await page.waitForURL((url) => appPath(url).endsWith('/recommendations'))

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
