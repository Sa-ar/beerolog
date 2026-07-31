import { useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client/client'

export const beerMatchQueryKey = (beerId: string) => ['beer-match', beerId] as const

/** Baseline taste fit 0–100 for a catalog beer (signed-in). null when unknown. */
export async function fetchBeerMatchPercent(beerId: string): Promise<number | null> {
  const { data, error } = await apiClient.POST('/menu/rank', {
    body: { beer_ids: [beerId] },
  })
  if (error || !data?.length) return null
  const fit = data[0]?.taste_fit
  if (fit == null || Number.isNaN(fit)) return null
  return Math.round(Math.max(0, Math.min(1, fit)) * 100)
}

export function useBeerMatchPercent(beerId: string, enabled: boolean) {
  return useQuery({
    queryKey: beerMatchQueryKey(beerId),
    queryFn: () => fetchBeerMatchPercent(beerId),
    enabled,
    retry: false,
    staleTime: 60_000,
  })
}
