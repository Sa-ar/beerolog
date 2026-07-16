import { useMutation } from '@tanstack/react-query'
import { apiClient } from './api-client/client'
import type { components } from './api-client/schema'

export type MenuScanResultItem = components['schemas']['ScanResultItem']
export type MenuSessionIntent = components['schemas']['SessionIntent']

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
