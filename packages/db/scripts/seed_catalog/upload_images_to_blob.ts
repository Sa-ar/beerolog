/**
 * Upload catalog label images to Vercel Blob and rewrite imageUrl in israel-catalog.json.
 *
 * Reads staged files from apps/web/public/catalog/beers/ (or existing local paths in JSON).
 * Does not use Untappd or other third-party URLs in the catalog output.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=... pnpm --filter @beerolog/db upload:catalog-images
 *   pnpm --filter @beerolog/db upload:catalog-images -- --force   # re-upload blob URLs too
 */

import fs from 'node:fs'
import path from 'node:path'

import { put } from '@vercel/blob'

import {
  BLOB_PREFIX,
  blobToken,
  CATALOG_PATH,
  contentTypeForExt,
  IMAGE_DIR,
  isBlobUrl,
  REPO_ROOT,
} from './blob_config'

type CatalogRow = {
  id: string
  imageUrl?: string | null
}

const EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const

function resolveLocalFile(row: CatalogRow): string | null {
  const fromUrl = row.imageUrl
  if (fromUrl?.startsWith('/catalog/beers/')) {
    const candidate = path.join(IMAGE_DIR, path.basename(fromUrl))
    if (fs.existsSync(candidate)) return candidate
  }
  for (const ext of EXTENSIONS) {
    const candidate = path.join(IMAGE_DIR, `${row.id}${ext}`)
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

async function uploadFile(localPath: string, beerId: string): Promise<string> {
  const ext = path.extname(localPath).toLowerCase() || '.jpg'
  const pathname = `${BLOB_PREFIX}/${beerId}${ext}`
  const body = fs.readFileSync(localPath)
  const result = await put(pathname, body, {
    access: 'public',
    token: blobToken(),
    allowOverwrite: true,
    contentType: contentTypeForExt(ext),
    addRandomSuffix: false,
  })
  return result.url
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let index = 0

  async function worker(): Promise<void> {
    while (index < items.length) {
      const i = index++
      results[i] = await fn(items[i])
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force')
  if (!fs.existsSync(CATALOG_PATH)) {
    throw new Error(`Catalog not found: ${CATALOG_PATH}`)
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8')) as CatalogRow[]
  const token = blobToken()

  const pending = catalog.filter((row) => {
    if (isBlobUrl(row.imageUrl) && !force) return false
    return resolveLocalFile(row) !== null
  })

  console.log(`Uploading ${pending.length} images to Vercel Blob (${catalog.length} catalog rows)`)

  let uploaded = 0
  let skipped = 0

  await mapPool(pending, 8, async (row) => {
    const local = resolveLocalFile(row)
    if (!local) {
      skipped += 1
      return
    }
    try {
      const url = await uploadFile(local, row.id)
      row.imageUrl = url
      uploaded += 1
      console.log(`  blob: ${row.id}`)
    } catch (err) {
      console.error(`  failed: ${row.id}`, err)
      throw err
    }
  })

  fs.writeFileSync(CATALOG_PATH, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')

  const onBlob = catalog.filter((b) => isBlobUrl(b.imageUrl)).length
  console.log(`\nDone. Uploaded ${uploaded}, skipped ${skipped}.`)
  console.log(`Catalog imageUrl on Vercel Blob: ${onBlob}/${catalog.length}`)
  console.log(`Token prefix: ${token.slice(0, 8)}…`)
  console.log(`Repo: ${REPO_ROOT}`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
