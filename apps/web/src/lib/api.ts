import { authHeaders } from './auth'

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:8000'

export type TapListResponse = {
  venue_id: string
  beer_ids: string[]
}

export type ScanResultItem = {
  raw_text: string
  matched_id: string | null
  confidence: number
  needs_review: boolean
}

export async function getTapList(venueId: string): Promise<TapListResponse> {
  const res = await fetch(`${API_URL}/venues/${venueId}/tap-list`)
  if (!res.ok) throw new Error('Failed to fetch tap list')
  return res.json() as Promise<TapListResponse>
}

export async function setTapList(venueId: string, beerIds: string[]): Promise<TapListResponse> {
  const res = await fetch(`${API_URL}/venues/${venueId}/tap-list`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ beer_ids: beerIds }),
  })
  if (!res.ok) throw new Error('Failed to update tap list')
  return res.json() as Promise<TapListResponse>
}

export async function resolveQRToken(token: string): Promise<TapListResponse> {
  const res = await fetch(`${API_URL}/scan/${token}`)
  if (!res.ok) throw new Error('Invalid or expired QR code')
  return res.json() as Promise<TapListResponse>
}

// ── User profile ─────────────────────────────────────────────────────────────

export async function saveProfile(vector: number[]): Promise<void> {
  const res = await fetch(`${API_URL}/users/me/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ vector }),
  })
  if (!res.ok) throw new Error('Failed to save profile')
}

export type PersonaData = {
  id: string
  name: string
  icon: string
  description: string
}

// ── Friend challenge ──────────────────────────────────────────────────────────────

export type ComparisonResult = {
  similarity: number
  shared: string[]
  different: string[]
  challenger_persona: { id: string; name: string; icon: string }
  friend_persona: { id: string; name: string; icon: string }
}

export async function createChallenge(): Promise<{ token: string }> {
  const res = await fetch(`${API_URL}/challenges`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Failed to create challenge')
  return res.json() as Promise<{ token: string }>
}

export async function compareChallenge(token: string, vector: number[]): Promise<ComparisonResult> {
  const res = await fetch(`${API_URL}/challenges/${token}/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vector }),
  })
  if (res.status === 410) throw new Error('Challenge link has expired')
  if (!res.ok) throw new Error('Comparison failed')
  return res.json() as Promise<ComparisonResult>
}

export async function getMyPersona(): Promise<PersonaData | null> {
  const res = await fetch(`${API_URL}/users/me/persona`, { headers: authHeaders() })
  if (!res.ok) return null
  const data = res.json() as Promise<{ persona: PersonaData | null }>
  return (await data).persona
}

export async function rateBeer(
  beer: { id: string; name: string; style: string; flavor_vector: number[] },
  rating: 'loved' | 'fine' | 'disliked',
): Promise<void> {
  await fetch(`${API_URL}/users/me/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ beer, rating }),
  })
}

export async function getMyHistory(): Promise<Array<{ beer_id: string; rating: string | null; tried_at: string }>> {
  const res = await fetch(`${API_URL}/users/me/history`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch history')
  const data = res.json() as Promise<{ entries: Array<{ beer_id: string; rating: string | null; tried_at: string }> }>
  return (await data).entries
}

// ── Group sessions ────────────────────────────────────────────────────────

export type SessionStatus = {
  session_id: string
  total: number
  completed: number
  participants: Array<{ id: string; name: string; submitted: boolean }>
}

export type GroupRecommendation = {
  group_vector: number[]
  high_variance: boolean
}

export async function createSession(hostId: string): Promise<{ session_id: string; expires_at: string }> {
  const res = await fetch(`${API_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host_id: hostId }),
  })
  if (!res.ok) throw new Error('Failed to create session')
  return res.json() as Promise<{ session_id: string; expires_at: string }>
}

export async function joinSession(sessionId: string, name: string): Promise<{ participant_id: string }> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  if (res.status === 410) throw new Error('Session has expired')
  if (!res.ok) throw new Error('Failed to join session')
  return res.json() as Promise<{ participant_id: string }>
}

export async function submitVector(sessionId: string, participantId: string, vector: number[]): Promise<void> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ participant_id: participantId, vector }),
  })
  if (!res.ok) throw new Error('Failed to submit vector')
}

export async function getSessionStatus(sessionId: string): Promise<SessionStatus> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/status`)
  if (!res.ok) throw new Error('Session not found')
  return res.json() as Promise<SessionStatus>
}

export async function getGroupRecommendation(sessionId: string): Promise<GroupRecommendation> {
  const res = await fetch(`${API_URL}/sessions/${sessionId}/recommend`)
  if (!res.ok) throw new Error('Failed to get recommendation')
  return res.json() as Promise<GroupRecommendation>
}

export type LeaderboardEntry = {
  user_id: string
  username: string
  persona_icon: string
  recommendation_count: number
  rank: number
}

export type LeaderboardResponse = {
  entries: LeaderboardEntry[]
  viewer_rank: number | null
}

export async function getLeaderboard(venueId: string): Promise<LeaderboardResponse> {
  const res = await fetch(`${API_URL}/venues/${venueId}/leaderboard`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Failed to fetch leaderboard')
  return res.json() as Promise<LeaderboardResponse>
}

export async function scanMenuImage(
  venueId: string,
  imageBase64: string,
  catalog: Array<{ id: string; name: string; brewery: string }>,
): Promise<ScanResultItem[]> {
  const res = await fetch(`${API_URL}/venues/${venueId}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: imageBase64, catalog }),
  })
  if (!res.ok) throw new Error('Scan failed')
  return res.json() as Promise<ScanResultItem[]>
}
