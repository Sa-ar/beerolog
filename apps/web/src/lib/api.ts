import { authHeaders } from './auth'

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:8000'

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
