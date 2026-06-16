/**
 * computeAdventurousness: pure 0..1 score per beer.
 *
 * Used by the Match engine's novelty re-rank. PRD §Implementation Decisions
 * caveats this as ad-hoc until rating data accumulates; see ADR-0003.
 *
 * Composition:
 *   - marketTier weight: mainstream 0.0, craft 0.5, import 0.3
 *   - style rarity in the catalog: rare styles +up to 0.3
 *   - ABV intensity: above 7% adds up to 0.2
 */

import type { NormalisedBeer } from './normalise_row'

const TIER_WEIGHT: Record<NormalisedBeer['marketTier'], number> = {
  mainstream: 0.0,
  craft: 0.5,
  import: 0.3,
}

export function computeStyleRarity(catalog: NormalisedBeer[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const b of catalog) counts.set(b.style, (counts.get(b.style) ?? 0) + 1)
  const total = catalog.length
  const rarity = new Map<string, number>()
  for (const [style, n] of counts) {
    // 0..1, rare styles → close to 1
    rarity.set(style, Math.max(0, 1 - n / total * 3))
  }
  return rarity
}

export function computeAdventurousness(
  beer: NormalisedBeer,
  rarity: Map<string, number>,
): number {
  const tierComponent = TIER_WEIGHT[beer.marketTier]
  const rarityComponent = (rarity.get(beer.style) ?? 0) * 0.3
  const abvComponent = Math.max(0, Math.min(0.2, (beer.abv - 7.0) / 5.0))
  const raw = tierComponent + rarityComponent + abvComponent
  return Math.max(0, Math.min(1, raw))
}
