import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'
import { getAuthToken } from '../auth-session'

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:8000'

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = await getAuthToken()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  },
  async onResponse({ response }) {
    if (response.status === 401 && typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.assign(`/signin?next=${next}`)
    }
    return response
  },
}

export const apiClient = createClient<paths>({ baseUrl: API_URL })

apiClient.use(authMiddleware)
