import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const REPO_ROOT = path.resolve(__dirname, '../../../..')

export const CATALOG_PATH = path.join(REPO_ROOT, 'packages/db/data/israel-catalog.json')
export const IMAGE_DIR = path.join(REPO_ROOT, 'apps/web/public/catalog/beers')
export const BLOB_PREFIX = 'catalog/beers'
export const BLOB_HOST = 'blob.vercel-storage.com'

const ENV_CANDIDATES = [
  path.join(REPO_ROOT, '.env.local'),
  path.join(REPO_ROOT, '.env'),
  path.join(REPO_ROOT, 'apps/web/.env.local'),
  path.join(REPO_ROOT, 'apps/api/.env'),
]

for (const envPath of ENV_CANDIDATES) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath, override: false })
  }
}

export function blobToken(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN?.trim()
  if (!token) {
    throw new Error(
      'BLOB_READ_WRITE_TOKEN is not set. Create a Vercel Blob store and add the read-write token to .env.local (see apps/web/.env.local.example).',
    )
  }
  return token
}

export function isBlobUrl(url: string | null | undefined): boolean {
  return !!url && url.includes(BLOB_HOST)
}

export function contentTypeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.jpeg':
    case '.jpg':
      return 'image/jpeg'
    default:
      return 'application/octet-stream'
  }
}
