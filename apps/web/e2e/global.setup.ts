import { createClerkClient } from '@clerk/backend'
import { clerkSetup } from '@clerk/testing/playwright'
import { test as setup } from '@playwright/test'

setup('clerk setup', async () => {
  // Mint a Clerk Testing Token. Dev Clerk instances normally require a
  // dev-browser handshake (__clerk_hs_reason=dev-browser-missing) that never
  // completes in headless CI against an SSO-protected preview, so Clerk hangs
  // and neither <Show> branch renders. The Testing Token bypasses it.
  await clerkSetup({
    publishableKey:
      process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY,
  })

  // Provision the e2e user idempotently — no manual seeding, ever. The
  // +clerk_test email means dev Clerk sends no real mail and accepts the fixed
  // OTP 424242, so the new-device verification step in the test is automatable.
  const email = process.env.E2E_CLERK_EMAIL
  const password = process.env.E2E_CLERK_PASSWORD
  const secretKey = process.env.CLERK_SECRET_KEY
  if (email && password && secretKey) {
    const clerk = createClerkClient({ secretKey })
    const { totalCount } = await clerk.users.getUserList({ emailAddress: [email] })
    if (totalCount === 0) {
      await clerk.users.createUser({
        emailAddress: [email],
        password,
        skipPasswordChecks: true,
      })
    }
  }
})
