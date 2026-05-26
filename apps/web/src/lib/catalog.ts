import { BEER_SEEDS } from '../data/beers'
import type { RecommendationBeer } from './api'

export type CatalogBeer = (typeof BEER_SEEDS)[number]

export function getBeerId(beer: CatalogBeer): string {
  return beer.name
}

export function toRecommendationBeer(beer: CatalogBeer): RecommendationBeer {
  return {
    id: getBeerId(beer),
    name: beer.name,
    brewery: beer.brewery,
    style: beer.style,
    flavor_vector: [...beer.fv],
    description: beer.description,
  }
}

export const SOLO_RECOMMENDATION_CATALOG = BEER_SEEDS.map(toRecommendationBeer)

export const BEER_METADATA_BY_ID = Object.fromEntries(
  BEER_SEEDS.map((beer) => [getBeerId(beer), beer]),
) as Record<string, CatalogBeer>
