/**
 * The current user's ratings as a beer_id -> Rating map. The re-rate surfaces
 * (search, recommendations) join this into their beer lists to show the
 * existing rating from server truth (issue #3). Fetched once and cached.
 */
import type { Rating } from '@beerolog/types'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client/client'

export const MY_RATINGS_KEY = ['me', 'ratings', 'map'] as const

async function fetchMyRatings(): Promise<Record<string, Rating>> {
  const { data, error } = await apiClient.GET('/me/ratings/map')
  if (error || !data) throw new Error('Failed to load ratings')
  return data.ratings as Record<string, Rating>
}

export function useMyRatings(): Record<string, Rating> {
  const { data } = useQuery({
    queryKey: MY_RATINGS_KEY,
    queryFn: fetchMyRatings,
    staleTime: 60_000,
  })
  return data ?? {}
}
