import { getQueryClient } from '@beerolog/shared'
import { apiClient } from './api-client/client'
import type { components } from './api-client/schema'

export type CatalogBeer = components['schemas']['CatalogBeer']

export const catalogBeerQueryKey = (id: string) => ['catalog-beer', id] as const

export async function fetchCatalogBeer(id: string): Promise<CatalogBeer> {
  const { data, error } = await apiClient.GET('/catalog/{beer_id}', {
    params: { path: { beer_id: id } },
  })
  if (error || !data) throw new Error('not-found')
  return data
}

/** Load beer for the route loader; seed the browser query cache so useQuery is instant. */
export async function loadCatalogBeer(id: string): Promise<CatalogBeer | null> {
  try {
    const beer = await fetchCatalogBeer(id)
    if (typeof window !== 'undefined') {
      getQueryClient().setQueryData(catalogBeerQueryKey(id), beer)
    }
    return beer
  } catch {
    return null
  }
}
