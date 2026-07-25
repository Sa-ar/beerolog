import type { Lang } from '../i18n/locale-cookie'

// Share the viewer's taste archetype (slice #289). Reuses the recommendations
// share pattern (navigator.share + clipboard fallback, no share lib). On mobile
// it fetches the slice-4 `size=story` PNG and passes it via
// navigator.share({ files }) so it drops straight into an Instagram Story;
// everywhere else it falls back to copying the /taste/{key} link.
export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'unavailable'

type ShareArchetypeOptions = {
  key: string
  lang: Lang
  /** Localized share caption. */
  text: string
  /** Origin override (defaults to window.location.origin) — injectable for tests. */
  origin?: string
}

async function fetchStoryImage(origin: string, key: string, lang: string): Promise<File | null> {
  try {
    const res = await fetch(`${origin}/api/og/taste/${key}?size=story&lang=${lang}`)
    if (!res.ok) return null
    const blob = await res.blob()
    return new File([blob], `beerolog-${key}.png`, { type: 'image/png' })
  } catch {
    return null
  }
}

export async function shareArchetype(opts: ShareArchetypeOptions): Promise<ShareOutcome> {
  const origin = opts.origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const url = `${origin}/taste/${opts.key}`
  const nav = typeof navigator !== 'undefined' ? navigator : undefined

  if (nav?.share) {
    try {
      const file = await fetchStoryImage(origin, opts.key, opts.lang)
      if (file && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: opts.text, url })
      } else {
        await nav.share({ text: opts.text, url })
      }
      return 'shared'
    } catch (err) {
      // User dismissed the native sheet — don't fall through to clipboard.
      if ((err as Error)?.name === 'AbortError') return 'dismissed'
      // Any other share failure falls through to the copy-link fallback.
    }
  }

  try {
    await nav?.clipboard?.writeText(`${opts.text} ${url}`)
    return 'copied'
  } catch {
    return 'unavailable'
  }
}
