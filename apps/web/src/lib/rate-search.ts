/**
 * Search the catalog for a specific beer and rate it directly (#220), for users
 * who already know what they want to rate instead of working the suggested deck.
 * Search is react-query server state; rating a result upserts via POST /ratings
 * (not the deck's /rate/session, which skips already-rated beers) so an existing
 * rating can be changed here, then invalidates the deck + rating count.
 */
import type { Rating } from '@beerolog/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './api-client/client'

export type SearchBeer = {
  id: string
  name: string
  name_hebrew?: string | null
  brewery: string
  style: string
  abv: number
}

async function searchBeers(q: string): Promise<SearchBeer[]> {
  const { data, error } = await apiClient.GET('/catalog/search', {
    params: { query: { q, limit: 10 } },
  })
  if (error || !data) throw new Error('Search failed')
  return data
}

export function useBeerSearch(query: string) {
  const q = query.trim()
  return useQuery({
    queryKey: ['catalog', 'search', q],
    queryFn: () => searchBeers(q),
    enabled: q.length >= 2,
    staleTime: 60_000,
  })
}

export function useRateOne() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      beerId,
      rating,
      note,
    }: {
      beerId: string
      rating: Rating
      note?: string
    }) => {
      const { error } = await apiClient.POST('/ratings', {
        body: { beer_id: beerId, rating, ...(note ? { note } : {}) },
      })
      if (error) throw new Error('Failed to save rating')
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'ratings', 'count'] })
      void queryClient.invalidateQueries({ queryKey: ['me', 'ratings', 'map'] })
      void queryClient.invalidateQueries({ queryKey: ['rate', 'deck'] })
    },
  })
}
