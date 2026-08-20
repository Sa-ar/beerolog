import createClient, { type Middleware } from 'openapi-fetch'
import { getAuthToken } from '@beerolog/shared'

export type CreateApiClientOptions = {
  baseUrl: string
  /** Called when a request returns 401 (e.g. redirect to sign-in). App-specific. */
  onUnauthorized?: () => void
}

// @beerolog/api-client — the openapi-fetch client factory + auth wiring, shared
// by every app in the workspace. The generated OpenAPI `paths` type stays
// app-specific and is supplied by the caller.
export function createApiClient<Paths extends object>(options: CreateApiClientOptions) {
  const client = createClient<Paths>({ baseUrl: options.baseUrl })
  const authMiddleware: Middleware = {
    async onRequest({ request }) {
      const token = await getAuthToken()
      if (token) request.headers.set('Authorization', `Bearer ${token}`)
      return request
    },
    async onResponse({ response }) {
      if (response.status === 401) options.onUnauthorized?.()
      return response
    },
  }
  client.use(authMiddleware)
  return client
}

export { getAuthToken, registerAuthTokenGetter } from '@beerolog/shared'
