import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

// Local creds/URL live in apps/web/.env.e2e (gitignored). CI passes them as env vars.
dotenv.config({ path: '.env.e2e' })
// Local Clerk keys (VITE_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY) live here; CI
// passes them as env vars. clerkSetup() needs them to mint a Testing Token.
dotenv.config({ path: '.env' })

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    // Point at a dev deployment (dev Clerk + dev API) or a local dev server.
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Vercel preview URLs are SSO-protected; bypass via the automation secret
    // (Vercel: Settings → Deployment Protection → Protection Bypass for Automation).
    extraHTTPHeaders: process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          'x-vercel-protection-bypass': process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
          'x-vercel-set-bypass-cookie': 'true',
        }
      : {},
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
})
