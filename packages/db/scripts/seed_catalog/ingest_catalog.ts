/**
 * Ingest scraped catalog records: download label images to apps/web/public,
 * normalise rows, synthesise notes, compute adventurousness.
 *
 * Input:  path to scraped JSON (private scrape artifact — not DB-safe)
 * Output: packages/db/data/israel-catalog.json (no Untappd references)
 * Images: apps/web/public/catalog/beers/{id}.{ext}
 *
 * Usage (from repo root):
 *   pnpm --filter @beerolog/db exec tsx scripts/seed_catalog/ingest_catalog.ts path/to/scrape.json
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { computeAdventurousness, computeStyleRarity } from './adventurousness'
import { normaliseRow, type NormalisedBeer } from './normalise_row'
import { synthesiseNotes } from './synthesise_notes'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../../../..')
const INPUT_PATH = process.argv[2] ? path.resolve(process.argv[2]) : null
const OUTPUT_PATH = path.join(REPO_ROOT, 'packages/db/data/israel-catalog.json')
const IMAGE_DIR = path.join(REPO_ROOT, 'apps/web/public/catalog/beers')

const DEFAULT_BADGE_FRAGMENT = 'badge-beer-default'
const IMAGE_BASE_PATH = '/catalog/beers'

type RawScrapeRow = {
  id: string
  name: string
  nameHebrew?: string | null
  brewery: string
  breweryCountry: string
  rawStyle: string
  abv: number
  ibu?: number | null
  imageUrl?: string | null
}

type CatalogRow = NormalisedBeer & {
  adventurousness: number
}

function extensionFromUrl(url: string, contentType: string | null): string {
  const fromUrl = path.extname(new URL(url).pathname).toLowerCase()
  if (fromUrl && fromUrl.length <= 5) return fromUrl
  if (contentType?.includes('png')) return '.png'
  if (contentType?.includes('webp')) return '.webp'
  if (contentType?.includes('gif')) return '.gif'
  return '.jpeg'
}

async function downloadImage(url: string, dest: string): Promise<boolean> {
  try {
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) return false
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length < 200) return false
    fs.writeFileSync(dest, buf)
    return true
  } catch {
    return false
  }
}

function inferAbv(raw: RawScrapeRow): number {
  if (raw.abv > 0) return raw.abv
  const style = raw.rawStyle.toLowerCase()
  if (/non-alcoholic|0%/.test(style)) return 0
  if (/malt beer|malt/.test(style) && raw.name.toLowerCase().includes('malty')) return 0.5
  if (/mead|cyser|melomel|braggot/.test(style)) return 12
  if (/imperial|double|tripel|strong/.test(style)) return 8
  if (/session|table/.test(style)) return 4.2
  return 5
}

function splitDisplayName(name: string, nameHebrew: string | null | undefined): {
  name: string
  nameHebrew: string | null
} {
  if (nameHebrew) return { name, nameHebrew }
  const paren = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (!paren) return { name, nameHebrew: null }
  const inner = paren[2].trim()
  const base = paren[1].trim()
  if (/[\u0590-\u05FF]/.test(inner)) return { name: base, nameHebrew: inner }
  return { name, nameHebrew: null }
}

async function ingestImages(
  rows: RawScrapeRow[],
): Promise<Map<string, string | null>> {
  fs.mkdirSync(IMAGE_DIR, { recursive: true })
  const imagePaths = new Map<string, string | null>()

  for (const row of rows) {
    const url = row.imageUrl
    if (!url || url.includes(DEFAULT_BADGE_FRAGMENT)) {
      imagePaths.set(row.id, null)
      continue
    }

    let ext = extensionFromUrl(url, null)
    let dest = path.join(IMAGE_DIR, `${row.id}${ext}`)
    const ok = await downloadImage(url, dest)
    if (!ok) {
      imagePaths.set(row.id, null)
      continue
    }

    // Re-resolve extension after download if URL had no suffix
    if (!fs.existsSync(dest)) {
      imagePaths.set(row.id, null)
      continue
    }

    // Prefer detected type from a HEAD-less second pass: keep written file ext
    imagePaths.set(row.id, `${IMAGE_BASE_PATH}/${row.id}${ext}`)
    process.stdout.write(`  image: ${row.id}\n`)
  }

  return imagePaths
}

async function main(): Promise<void> {
  if (!INPUT_PATH) {
    throw new Error(
      'Missing input path. Usage: ingest_catalog.ts <path-to-scrape.json>',
    )
  }
  if (!fs.existsSync(INPUT_PATH)) {
    throw new Error(`Input file not found: ${INPUT_PATH}`)
  }

  const raw = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8')) as RawScrapeRow[]
  console.log(`Ingesting ${raw.length} beers…`)

  console.log('Downloading label images…')
  const imagePaths = await ingestImages(raw)

  const normalised: NormalisedBeer[] = raw.map((row) => {
    const { name, nameHebrew } = splitDisplayName(row.name, row.nameHebrew)
    const abv = inferAbv(row)
    const { notes, lang } = synthesiseNotes(row.rawStyle, abv, row.brewery, nameHebrew)

    return normaliseRow({
      name,
      nameHebrew: nameHebrew ?? undefined,
      brewery: row.brewery,
      breweryCountry: row.breweryCountry,
      rawStyle: row.rawStyle,
      abv,
      ibu: row.ibu ?? undefined,
      tastingNotes: notes,
      tastingNotesLang: lang,
      notesSource: 'synthetic',
      imageUrl: imagePaths.get(row.id) ?? undefined,
      sourceUrl: undefined,
    })
  })

  const rarity = computeStyleRarity(normalised)
  const catalog: CatalogRow[] = normalised.map((beer) => ({
    ...beer,
    adventurousness: computeAdventurousness(beer, rarity),
  }))

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true })
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8')

  const withImages = catalog.filter((b) => b.imageUrl).length
  console.log(`\nWrote ${catalog.length} beers → ${OUTPUT_PATH}`)
  console.log(`  images hosted: ${withImages}/${catalog.length}`)
  console.log(`  image dir: ${IMAGE_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
