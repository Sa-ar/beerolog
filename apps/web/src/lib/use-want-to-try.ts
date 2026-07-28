/**
 * Want-to-try list (issue #325): the current user's saved beers, mirroring the
 * ratings hooks. Uses apiFetch (untyped) because the endpoint isn't in the
 * generated openapi client. Right-swipe adds `want`; super-like adds `must_try`
 * (pinned first, server-ordered). Removal is optimistic.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './api-fetch'

export type WantToTryState = 'want' | 'must_try'

export type WantToTryItem = {
  beer_id: string
  beer_name: string
  beer_brewery: string
  beer_image_url: string | null
  state: WantToTryState
  created_at: string
}

export const WANT_TO_TRY_KEY = ['me', 'want-to-try'] as const

async function fetchWantToTry(): Promise<WantToTryItem[]> {
  const res = await apiFetch('/me/want-to-try')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = (await res.json()) as { items: WantToTryItem[] }
  return data.items
}

export function useWantToTryList() {
  return useQuery({ queryKey: WANT_TO_TRY_KEY, queryFn: fetchWantToTry, staleTime: 60_000 })
}

export function useAddWantToTry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ beerId, state }: { beerId: string; state: WantToTryState }) => {
      const res = await apiFetch('/me/want-to-try', {
        method: 'POST',
        body: JSON.stringify({ beer_id: beerId, state }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: WANT_TO_TRY_KEY })
    },
  })
}

export function useRemoveWantToTry() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (beerId: string) => {
      const res = await apiFetch(`/me/want-to-try/${beerId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    },
    onMutate: async (beerId: string) => {
      await queryClient.cancelQueries({ queryKey: WANT_TO_TRY_KEY })
      const previous = queryClient.getQueryData<WantToTryItem[]>(WANT_TO_TRY_KEY)
      queryClient.setQueryData<WantToTryItem[]>(
        WANT_TO_TRY_KEY,
        (old) => old?.filter((item) => item.beer_id !== beerId) ?? [],
      )
      return { previous }
    },
    onError: (_err, _beerId, context) => {
      if (context?.previous) queryClient.setQueryData(WANT_TO_TRY_KEY, context.previous)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: WANT_TO_TRY_KEY })
    },
  })
}
