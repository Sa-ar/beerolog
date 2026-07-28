/**
 * The `What I want` deck's "haven't tried yet" refiner: drop beers the user has
 * already rated, preserving the match-first order (issue #324). Pure so it's
 * unit-testable; the deck joins it with useMyRatings.
 */
import type { Rating } from '@beerolog/types'

export function excludeRated<T extends { id: string }>(
  beers: T[],
  ratings: Record<string, Rating>,
): T[] {
  return beers.filter((beer) => !ratings[beer.id])
}
