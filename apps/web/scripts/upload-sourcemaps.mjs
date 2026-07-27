// Postbuild: upload client sourcemaps to PostHog for de-minified error tracking,
// then delete the .map files so they are never served publicly.
//
// - Runs against .vercel/output/static (the deployed browser bundle).
// - Skips the upload when POSTHOG_CLI_TOKEN is unset (local / preview) — the
//   build still succeeds.
// - Upload failures are logged, NOT fatal: analytics tooling must never break a
//   deploy. The .map files are removed either way.
//
// Needs (set in the Vercel PRODUCTION env only): POSTHOG_CLI_TOKEN (personal API
// key, write), POSTHOG_CLI_ENV_ID (project id). Region via VITE_POSTHOG_HOST.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const DIR = '.vercel/output/static'
const host = process.env.VITE_POSTHOG_HOST ?? 'https://eu.i.posthog.com'

if (!existsSync(DIR)) {
  console.log(`[sourcemaps] ${DIR} not found — nothing to do.`)
  process.exit(0)
}

if (process.env.POSTHOG_CLI_TOKEN) {
  const cli = (...args) =>
    execFileSync('pnpm', ['dlx', '@posthog/cli@latest', '--host', host, ...args], {
      stdio: 'inherit',
    })
  try {
    console.log('[sourcemaps] injecting chunk ids + uploading to PostHog…')
    cli('sourcemap', 'inject', '--directory', DIR)
    cli('sourcemap', 'upload', '--directory', DIR)
    console.log('[sourcemaps] upload done.')
  } catch (err) {
    console.warn('[sourcemaps] upload failed (non-fatal):', err?.message ?? err)
  }
} else {
  console.log('[sourcemaps] POSTHOG_CLI_TOKEN unset — skipping upload.')
}

// Never serve .map files to the public, regardless of upload outcome.
function deleteMaps(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) deleteMaps(p)
    else if (entry.name.endsWith('.map')) rmSync(p)
  }
}
deleteMaps(DIR)
console.log('[sourcemaps] removed .map files from the static output.')
