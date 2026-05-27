import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'drizzle-kit'

const currentDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(currentDir, '../..')
const envPaths = [resolve(repoRoot, 'apps/api/.env'), resolve(repoRoot, '.env')]

if (!process.env['DATABASE_URL']) {
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) {
      continue
    }

    loadEnvFile(envPath)

    if (process.env['DATABASE_URL']) {
      break
    }
  }
}

if (!process.env['DATABASE_URL']) {
  throw new Error(
    `DATABASE_URL is not set. Looked in process.env, ${envPaths.join(', ')}.`
  )
}

function loadEnvFile(envPath: string): void {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(envPath)
    return
  }

  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    if (!key || process.env[key] !== undefined) {
      continue
    }

    let value = line.slice(separatorIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL']!,
  },
})
