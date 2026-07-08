import { QueryClient } from '@tanstack/react-query'

// One QueryClient per browser tab; a fresh one per request on the server so no
// user's cache ever leaks into another's SSR render.
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

export function getQueryClient() {
  if (typeof window === 'undefined') return makeQueryClient()
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}
