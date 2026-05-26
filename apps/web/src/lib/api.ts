import type { components } from './api-client/schema'
import { apiClient } from './api-client/client'

export type PersonaData = components['schemas']['PersonaSummary']
export type HistoryEntry = components['schemas']['HistoryEntry']
export type RecommendationBeer = components['schemas']['BeerPayload']
export type RecommendationResult = components['schemas']['RecommendationResponse']

type RatedBeerInput = components['schemas']['RatedBeerInput']
type RatingValue = components['schemas']['RatingValue']

async function requireData<T>(
  request: Promise<{ data?: T; error?: unknown }>,
  message: string,
): Promise<T> {
  const { data, error } = await request
  if (error || data === undefined) {
    throw new Error(message)
  }
  return data
}

export async function saveProfile(vector: number[]): Promise<void> {
  await requireData(
    apiClient.PUT('/users/me/profile', {
      body: { vector },
    }),
    'Failed to save profile',
  )
}

export async function recommendBeers(
  vector: number[],
  beers: RecommendationBeer[],
): Promise<RecommendationResult> {
  return requireData(
    apiClient.POST('/recommendations/', {
      body: {
        taste_vector: {
          bitterness: vector[0] ?? 0.5,
          sweetness: vector[1] ?? 0.5,
          fruitiness: vector[2] ?? 0.5,
          roast: vector[3] ?? 0.5,
          sourness: vector[4] ?? 0.5,
          body: vector[5] ?? 0.5,
          adventure: vector[6] ?? 0.5,
        },
        beers,
      },
    }),
    'Failed to fetch recommendations',
  )
}

export async function getMyPersona(): Promise<PersonaData | null> {
  const { data } = await apiClient.GET('/users/me/persona')
  return data?.persona ?? null
}

export async function rateBeer(
  beer: RatedBeerInput,
  rating: RatingValue,
): Promise<void> {
  await requireData(
    apiClient.POST('/users/me/rate', {
      body: { beer, rating },
    }),
    'Failed to rate beer',
  )
}

export async function getMyHistory(): Promise<HistoryEntry[]> {
  const data = await requireData(
    apiClient.GET('/users/me/history'),
    'Failed to fetch history',
  )
  return data.entries
}
