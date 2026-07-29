import { getAuthToken } from './auth-session'

// Cast import.meta locally so consumers that re-typecheck this source (e.g.
// @beerolog/api-client) don't need vite/client ambient types. Runtime is
// unchanged — vite injects import.meta.env at build.
const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {}
const API_URL = env['VITE_API_URL'] ?? 'http://localhost:8000'

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken()
  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${API_URL}${path}`, { ...init, headers })
}
