import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'
import { getToken } from '../auth'

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:8000'

const authMiddleware: Middleware = {
  async onRequest({ request }) {
    const token = getToken()
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`)
    }
    return request
  },
}

export const apiClient = createClient<paths>({ baseUrl: API_URL })

apiClient.use(authMiddleware)
