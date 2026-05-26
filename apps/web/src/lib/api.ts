import type { components } from './api-client/schema'
import { apiClient } from './api-client/client'

export type TapListResponse = components['schemas']['TapListResponse']
export type ScanResultItem = components['schemas']['ScanResultItem']
export type PersonaData = components['schemas']['PersonaSummary']
export type ComparisonResult = components['schemas']['ChallengeComparisonResponse']
export type SessionStatus = components['schemas']['SessionStatusResponse']
export type GroupRecommendation = components['schemas']['GroupRecommendationResponse']
export type LeaderboardEntry = components['schemas']['LeaderboardEntryResponse']
export type LeaderboardResponse = components['schemas']['LeaderboardResponse']
export type HistoryEntry = components['schemas']['HistoryEntry']

type RatedBeerInput = components['schemas']['RatedBeerInput']
type RatingValue = components['schemas']['RatingValue']
type ScanCatalogEntry = components['schemas']['ScanCatalogEntry']

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

export async function getTapList(venueId: string): Promise<TapListResponse> {
  return requireData(
    apiClient.GET('/venues/{venue_id}/tap-list', {
      params: { path: { venue_id: venueId } },
    }),
    'Failed to fetch tap list',
  )
}

export async function setTapList(venueId: string, beerIds: string[]): Promise<TapListResponse> {
  return requireData(
    apiClient.PUT('/venues/{venue_id}/tap-list', {
      params: { path: { venue_id: venueId } },
      body: { beer_ids: beerIds },
    }),
    'Failed to save tap list',
  )
}

export async function resolveQRToken(token: string): Promise<TapListResponse> {
  return requireData(
    apiClient.GET('/scan/{token}', {
      params: { path: { token } },
    }),
    'Invalid or expired QR code',
  )
}

export async function saveProfile(vector: number[]): Promise<void> {
  await requireData(
    apiClient.PUT('/users/me/profile', {
      body: { vector },
    }),
    'Failed to save profile',
  )
}

export async function createChallenge(): Promise<components['schemas']['ChallengeTokenResponse']> {
  return requireData(
    apiClient.POST('/challenges'),
    'Failed to create challenge',
  )
}

export async function compareChallenge(token: string, vector: number[]): Promise<ComparisonResult> {
  return requireData(
    apiClient.POST('/challenges/{token}/compare', {
      params: { path: { token } },
      body: { vector },
    }),
    'Failed to compare challenge',
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

export async function createSession(hostId: string): Promise<components['schemas']['CreateSessionResponse']> {
  return requireData(
    apiClient.POST('/sessions', {
      body: { host_id: hostId },
    }),
    'Failed to create session',
  )
}

export async function joinSession(
  sessionId: string,
  name: string,
): Promise<components['schemas']['JoinSessionResponse']> {
  return requireData(
    apiClient.POST('/sessions/{session_id}/join', {
      params: { path: { session_id: sessionId } },
      body: { name },
    }),
    'Failed to join session',
  )
}

export async function submitVector(
  sessionId: string,
  participantId: string,
  vector: number[],
): Promise<void> {
  await requireData(
    apiClient.POST('/sessions/{session_id}/submit', {
      params: { path: { session_id: sessionId } },
      body: { participant_id: participantId, vector },
    }),
    'Failed to submit vector',
  )
}

export async function getSessionStatus(sessionId: string): Promise<SessionStatus> {
  return requireData(
    apiClient.GET('/sessions/{session_id}/status', {
      params: { path: { session_id: sessionId } },
    }),
    'Session not found',
  )
}

export async function getGroupRecommendation(sessionId: string): Promise<GroupRecommendation> {
  return requireData(
    apiClient.GET('/sessions/{session_id}/recommend', {
      params: { path: { session_id: sessionId } },
    }),
    'Failed to get recommendation',
  )
}

export async function getLeaderboard(venueId: string): Promise<LeaderboardResponse> {
  return requireData(
    apiClient.GET('/venues/{venue_id}/leaderboard', {
      params: { path: { venue_id: venueId } },
    }),
    'Failed to fetch leaderboard',
  )
}

export async function scanMenuImage(
  venueId: string,
  imageBase64: string,
  catalog: ScanCatalogEntry[],
): Promise<ScanResultItem[]> {
  return requireData(
    apiClient.POST('/venues/{venue_id}/scan', {
      params: { path: { venue_id: venueId } },
      body: { image_base64: imageBase64, catalog },
    }),
    'Scan failed',
  )
}
