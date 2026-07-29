import type { paths } from './schema'
import { createApiClient } from '@beerolog/api-client'

const API_URL = (import.meta.env['VITE_API_URL'] as string | undefined) ?? 'http://localhost:8000'

// App-specific instance: the shared factory wires auth + 401 handling; the
// OpenAPI `paths` type and the sign-in redirect stay here (slice #296).
export const apiClient = createApiClient<paths>({
  baseUrl: API_URL,
  onUnauthorized: () => {
    if (typeof window !== 'undefined') {
      const next = encodeURIComponent(window.location.pathname + window.location.search)
      window.location.assign(`/signin?next=${next}`)
    }
  },
})
