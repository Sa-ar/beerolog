import { useMutation, useQuery } from '@tanstack/react-query'
import { apiClient } from './api-client/client'
import type { components } from './api-client/schema'

export type MenuScanResultItem = components['schemas']['ScanResultItem']
export type MenuSessionIntent = components['schemas']['SessionIntent']
export type MenuChatMessage = components['schemas']['ChatMessage']
export type MenuChatPoolBeer = components['schemas']['ChatPoolBeer']
export type MenuChatResponse = components['schemas']['MenuChatResponse']

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Could not read image'))
        return
      }
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Could not encode image'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Could not read image'))
    reader.readAsDataURL(file)
  })
}

/** Server state for the menu-scan surface: upload a photo, get matched + ranked
 * beers. An optional `session` steers the ranking toward tonight's direction. */
export function useScanMenu() {
  return useMutation({
    mutationFn: async ({
      file,
      session,
    }: {
      file: File
      session?: MenuSessionIntent
    }): Promise<MenuScanResultItem[]> => {
      const image_base64 = await fileToBase64(file)
      const { data, error } = await apiClient.POST('/menu/scan', {
        body: { image_base64, ...(session ? { session } : {}) },
      })
      if (error || !data) throw new Error('Menu scan failed')
      return data
    },
  })
}

/** Rank an explicit set of catalog beers against the user's taste — the manual
 * "add a beer we missed" path. Same taste_fit scale as the scan, so results
 * merge into the same comparison list. Refetches when the id set or session
 * changes; disabled when nothing is added. */
export function useMenuRank(beerIds: string[], session?: MenuSessionIntent) {
  return useQuery({
    queryKey: ['menu', 'rank', [...beerIds].sort(), session ?? null],
    queryFn: async (): Promise<MenuScanResultItem[]> => {
      const { data, error } = await apiClient.POST('/menu/rank', {
        body: { beer_ids: beerIds, ...(session ? { session } : {}) },
      })
      if (error || !data) throw new Error('Menu rank failed')
      return data
    },
    enabled: beerIds.length > 0,
    staleTime: 60_000,
  })
}

/** Conversational surface: chat about the scanned pool. Stateless — the caller
 * passes the pool + full message history each turn; server holds nothing. */
export function useMenuChat() {
  return useMutation({
    mutationFn: async ({
      pool,
      messages,
    }: {
      pool: MenuChatPoolBeer[]
      messages: MenuChatMessage[]
    }): Promise<MenuChatResponse> => {
      const { data, error } = await apiClient.POST('/menu/chat', {
        body: { pool, messages },
      })
      if (error || !data) throw new Error('Menu chat failed')
      return data
    },
  })
}
