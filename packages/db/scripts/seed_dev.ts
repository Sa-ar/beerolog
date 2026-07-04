/**
 * Dev seed — enough sample data to use the app against a fresh DB (Neon branch
 * or local docker). Idempotent: re-running inserts nothing new.
 *
 *   DATABASE_URL=... pnpm --dir packages/db db:seed
 *
 * NOT the catalog pipeline (seed_catalog/* turns private scrapes into JSON).
 * Embeddings here are deterministic pseudo-vectors — fine for dev, not real
 * BeerEmbeddings. ponytail: swap for real embeddings only if you need the
 * matcher's ranking to be meaningful locally.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from '../src/schema'

const here = dirname(fileURLToPath(import.meta.url))

// Deterministic unit vector from a string seed (mulberry32). Same id -> same
// vector, so re-seeding is stable and different beers stay distinguishable.
export function seededVec(seed: string, dim = 1536): number[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  let s = h >>> 0
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const v = Array.from({ length: dim }, () => rand() * 2 - 1)
  let sum = 0
  for (const x of v) sum += x * x
  const norm = Math.sqrt(sum) || 1
  return v.map((x) => x / norm)
}

type BeerSeed = {
  id: string
  name: string
  nameHebrew: string | null
  brewery: string
  breweryCountry: string
  style: string
  abv: number
  ibu: number
  hops: string[]
  malts: string[]
  yeast: string
  color: 'pale' | 'gold' | 'amber' | 'brown' | 'dark'
  body: 'light' | 'medium' | 'full'
  sweetness: 'dry' | 'balanced' | 'sweet'
  marketTier: 'mainstream' | 'craft' | 'import'
  tastingNotes: string
  adventurousness: number
}

const BEERS: BeerSeed[] = [
  { id: 'goldstar', name: 'Goldstar', nameHebrew: 'גולדסטאר', brewery: 'Tempo', breweryCountry: 'Israel', style: 'Munich Dunkel', abv: 4.9, ibu: 18, hops: ['Hallertau'], malts: ['Munich', 'Pilsner'], yeast: 'Lager', color: 'amber', body: 'medium', sweetness: 'balanced', marketTier: 'mainstream', tastingNotes: 'Toasty malt, light caramel, clean dry finish.', adventurousness: 0.2 },
  { id: 'maccabee', name: 'Maccabee', nameHebrew: 'מכבי', brewery: 'Tempo', breweryCountry: 'Israel', style: 'Pale Lager', abv: 4.9, ibu: 15, hops: ['Saaz'], malts: ['Pilsner'], yeast: 'Lager', color: 'gold', body: 'light', sweetness: 'dry', marketTier: 'mainstream', tastingNotes: 'Crisp, grainy, faint floral hop. Easy drinking.', adventurousness: 0.15 },
  { id: 'alexander-blonde', name: 'Alexander Blonde', nameHebrew: 'אלכסנדר בלונד', brewery: 'Alexander', breweryCountry: 'Israel', style: 'Belgian Blonde', abv: 6.0, ibu: 22, hops: ['Styrian Goldings'], malts: ['Pilsner', 'Wheat'], yeast: 'Belgian Ale', color: 'gold', body: 'medium', sweetness: 'balanced', marketTier: 'craft', tastingNotes: 'Honeyed malt, pear, gentle spice from Belgian yeast.', adventurousness: 0.5 },
  { id: 'alexander-black', name: 'Alexander Black', nameHebrew: 'אלכסנדר שחור', brewery: 'Alexander', breweryCountry: 'Israel', style: 'Foreign Extra Stout', abv: 7.0, ibu: 40, hops: ['Magnum'], malts: ['Roasted Barley', 'Munich'], yeast: 'Ale', color: 'dark', body: 'full', sweetness: 'balanced', marketTier: 'craft', tastingNotes: 'Espresso, dark chocolate, licorice, warming finish.', adventurousness: 0.65 },
  { id: 'dancing-camel-hopper', name: 'Dancing Camel 666 Hopper', nameHebrew: null, brewery: 'Dancing Camel', breweryCountry: 'Israel', style: 'American IPA', abv: 6.6, ibu: 66, hops: ['Cascade', 'Centennial'], malts: ['Pale', 'Crystal'], yeast: 'Ale', color: 'gold', body: 'medium', sweetness: 'dry', marketTier: 'craft', tastingNotes: 'Resinous pine and grapefruit, firm bitter backbone.', adventurousness: 0.8 },
  { id: 'malka-blonde', name: 'Malka Blonde', nameHebrew: 'מלכה בלונדינית', brewery: 'Malka', breweryCountry: 'Israel', style: 'Golden Ale', abv: 5.6, ibu: 28, hops: ['Cascade'], malts: ['Pale'], yeast: 'Ale', color: 'gold', body: 'medium', sweetness: 'balanced', marketTier: 'craft', tastingNotes: 'Bready malt, citrus zest, soft bitterness.', adventurousness: 0.45 },
  { id: 'negev-amber', name: 'Negev Amber', nameHebrew: 'נגב ענבר', brewery: 'Negev', breweryCountry: 'Israel', style: 'Amber Ale', abv: 5.5, ibu: 30, hops: ['Fuggle'], malts: ['Crystal', 'Munich'], yeast: 'Ale', color: 'amber', body: 'medium', sweetness: 'balanced', marketTier: 'craft', tastingNotes: 'Caramel, toffee, earthy hop, smooth.', adventurousness: 0.5 },
  { id: 'weihenstephan-hefe', name: 'Weihenstephaner Hefeweissbier', nameHebrew: null, brewery: 'Weihenstephan', breweryCountry: 'Germany', style: 'Hefeweizen', abv: 5.4, ibu: 14, hops: ['Hallertau'], malts: ['Wheat', 'Barley'], yeast: 'Weizen', color: 'gold', body: 'medium', sweetness: 'balanced', marketTier: 'import', tastingNotes: 'Banana, clove, fluffy wheat, low bitterness.', adventurousness: 0.55 },
  { id: 'guinness-draught', name: 'Guinness Draught', nameHebrew: 'גינס', brewery: 'Guinness', breweryCountry: 'Ireland', style: 'Irish Dry Stout', abv: 4.2, ibu: 45, hops: ['Goldings'], malts: ['Roasted Barley', 'Flaked Barley'], yeast: 'Ale', color: 'dark', body: 'medium', sweetness: 'dry', marketTier: 'import', tastingNotes: 'Roast coffee, dry, creamy nitro body.', adventurousness: 0.5 },
  { id: 'chimay-blue', name: 'Chimay Blue', nameHebrew: null, brewery: 'Chimay', breweryCountry: 'Belgium', style: 'Belgian Strong Dark', abv: 9.0, ibu: 35, hops: ['Hallertau'], malts: ['Pilsner', 'Caramel'], yeast: 'Trappist', color: 'brown', body: 'full', sweetness: 'sweet', marketTier: 'import', tastingNotes: 'Dark fruit, fig, brown sugar, warming.', adventurousness: 0.85 },
  { id: 'pilsner-urquell', name: 'Pilsner Urquell', nameHebrew: null, brewery: 'Plzeňský Prazdroj', breweryCountry: 'Czechia', style: 'Czech Pilsner', abv: 4.4, ibu: 40, hops: ['Saaz'], malts: ['Pilsner'], yeast: 'Lager', color: 'gold', body: 'light', sweetness: 'dry', marketTier: 'import', tastingNotes: 'Rich Saaz spice, soft malt, crisp bitter snap.', adventurousness: 0.3 },
  { id: 'lagunitas-ipa', name: 'Lagunitas IPA', nameHebrew: null, brewery: 'Lagunitas', breweryCountry: 'USA', style: 'American IPA', abv: 6.2, ibu: 51, hops: ['Cascade', 'Centennial', 'Chinook'], malts: ['Pale', 'CaraMalt'], yeast: 'Ale', color: 'gold', body: 'medium', sweetness: 'dry', marketTier: 'import', tastingNotes: 'Citrus, caramel sweetness, lingering hop bitterness.', adventurousness: 0.75 },
]

const DEMO_USER_ID = 'user_demo'

async function main() {
  // DATABASE_URL usually lives in apps/api/.env (the same source drizzle.config
  // reads), not the shell — load it so `pnpm db:seed` / `db.sh seed` work
  // standalone, not only when db.sh has already exported it. Real env wins.
  if (!process.env['DATABASE_URL']) {
    loadEnv({ path: resolve(here, '../../../apps/api/.env') })
  }
  const url = process.env['DATABASE_URL']
  if (!url) {
    console.error('seed: DATABASE_URL not set (looked in env and apps/api/.env)')
    process.exit(1)
  }

  const client = postgres(url)
  const db = drizzle(client, { schema })

  await db
    .insert(schema.beers)
    .values(
      BEERS.map((b) => ({
        ...b,
        tastingNotesLang: 'en' as const,
        notesSource: 'synthetic' as const,
        embedding: seededVec(b.id),
      })),
    )
    .onConflictDoNothing()

  await db
    .insert(schema.users)
    .values({ id: DEMO_USER_ID, email: 'demo@beerolog.test', displayName: 'Demo Taster' })
    .onConflictDoNothing()

  await db
    .insert(schema.userBaselineTaste)
    .values({
      userId: DEMO_USER_ID,
      bubbles: 0.5,
      bitterness: 0.55,
      sweetness: 0.4,
      body: 0.5,
      abvAffinity: 0.5,
      flavorFamily: { malty: 0.6, hoppy: 0.5, roasty: 0.3, fruity: 0.4, sour: 0.1, smoky: 0.1 },
      noveltyAffinity: 0.5,
      modelVersion: 2,
      embedding: seededVec(DEMO_USER_ID),
    })
    .onConflictDoNothing()

  await db
    .insert(schema.beerRatings)
    .values([
      { userId: DEMO_USER_ID, beerId: 'goldstar', rating: 'fine', note: 'Reliable.' },
      { userId: DEMO_USER_ID, beerId: 'alexander-black', rating: 'loved', note: 'Loved the roast.' },
      { userId: DEMO_USER_ID, beerId: 'lagunitas-ipa', rating: 'loved', note: null },
      { userId: DEMO_USER_ID, beerId: 'guinness-draught', rating: 'fine', note: null },
      { userId: DEMO_USER_ID, beerId: 'maccabee', rating: 'disliked', note: 'Too plain.' },
    ])
    .onConflictDoNothing()

  await client.end()
  console.log(`seed: ${BEERS.length} beers, 1 demo user + baseline, 5 ratings (idempotent)`)
}

// run only when executed directly, not when imported (e.g. by seed_dev.check.ts)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
