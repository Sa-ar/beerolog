import { type FlavorVector, serializeFlavorVector } from '@beerolog/types'
import { BEER_SEEDS } from '../data/beers'

export type ScoredBeer = (typeof BEER_SEEDS)[number] & { score: number }

export type RecommendationSlots = {
  best: ScoredBeer
  backup: ScoredBeer | null
  adventurous: ScoredBeer | null
  allScored: ScoredBeer[]
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0
  for (let i = 0; i < a.length; i++) {
    dot += (a[i] ?? 0) * (b[i] ?? 0)
    magA += (a[i] ?? 0) ** 2
    magB += (b[i] ?? 0) ** 2
  }
  return magA === 0 || magB === 0 ? 0 : dot / (Math.sqrt(magA) * Math.sqrt(magB))
}

export function getRecommendationSlots(
  vector: FlavorVector,
  beers = BEER_SEEDS,
  excludeIds: string[] = [],
): RecommendationSlots {
  const userVec = serializeFlavorVector(vector)
  const adventureBoost = (vector.adventure - 0.5) * 0.3

  const allScored: ScoredBeer[] = beers
    .filter((b) => !excludeIds.includes(b.name))
    .map((b) => {
      const beerVec = b.fv as number[]
      const baseScore = cosine(userVec, beerVec)
      // Adventure boost: reward beers with high adventure attribute for adventurous users
      const adventureScore = adventureBoost * (beerVec[6] ?? 0.5)
      return { ...b, score: baseScore + adventureScore }
    })
    .sort((a, b) => b.score - a.score)

  const best = allScored[0]!
  const backup = allScored[1] ?? null

  // Adventurous slot: highest-scoring beer not in top 2 that also has high adventure attribute
  const remaining = allScored.slice(2)
  const adventurous =
    remaining.length > 0
      ? [...remaining].sort(
          (a, b) =>
            b.score * 0.5 + (b.fv[6] ?? 0) * 0.5 - (a.score * 0.5 + (a.fv[6] ?? 0) * 0.5),
        )[0] ?? null
      : null

  return { best, backup, adventurous, allScored }
}
