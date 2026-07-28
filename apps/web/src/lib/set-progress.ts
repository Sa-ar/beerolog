// Set = a finite, completable group of beers (issue #334, CONTEXT.md). Catching
// every beer in a Set is the shareable "catch 'em all" milestone.
export type BeerSet = { key: string; nameKey: string; beerIds: string[] }

export type SetProgress = {
  caught: number
  total: number
  isComplete: boolean
  missing: string[]
}

/** Progress of a user's catches against a Set. Pure; dedups Set membership. */
export function computeSetProgress(
  setBeerIds: string[],
  caughtBeerIds: Iterable<string>,
): SetProgress {
  const caught = new Set(caughtBeerIds)
  const uniqueSetIds = [...new Set(setBeerIds)]
  const missing = uniqueSetIds.filter((id) => !caught.has(id))
  const total = uniqueSetIds.length
  return {
    caught: total - missing.length,
    total,
    isComplete: total > 0 && missing.length === 0,
    missing,
  }
}

// ponytail: demo Set is a code constant with catalog slugs. TODO(product):
// finalize the full "Israeli Craft Starter" line-up against the seeded catalog
// before promoting it; these two are the confirmed craft IDs.
export const ISRAELI_CRAFT_STARTER: BeerSet = {
  key: 'israeli-craft-starter',
  nameKey: 'sets.israeliCraftStarter',
  beerIds: ['alexander-blazer', 'malka-stout'],
}
