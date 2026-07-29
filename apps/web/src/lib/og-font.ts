// Font loader for the @vercel/og image endpoint. Satori needs a real TTF/OTF
// ArrayBuffer (not woff2). Rubik (covers Latin + Hebrew) is embedded as base64
// and decoded here — NO runtime fetch, which was the root cause of the
// @vercel/og 503s (#316). Module-cached; returns null on any decode failure so
// the endpoint still renders instead of 500-ing.
import { RUBIK_700_BASE64 } from './og-font-data'

let cache: ArrayBuffer | null = null

function decodeFont(): ArrayBuffer | null {
  try {
    const binary = atob(RUBIK_700_BASE64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    return bytes.buffer
  } catch {
    return null
  }
}

export function loadOgFont(): Promise<ArrayBuffer | null> {
  if (!cache) cache = decodeFont()
  return Promise.resolve(cache)
}
