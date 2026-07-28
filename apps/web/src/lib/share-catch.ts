import type { Rating } from '@beerolog/types'
import type { Lang } from '../i18n/locale-cookie'

// Share a single Catch (issue #332). Mirrors share-archetype: fetch the
// size=story PNG and pass it via navigator.share({ files }) so it drops into an
// Instagram Story; fall back to copying the /beer/{id} link everywhere else.
export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'unavailable'

type ShareCatchOptions = {
  beerId: string
  name: string
  rating: Rating
  photo: string
  lang: Lang
  /** Localized share caption. */
  text: string
  /** Origin override (defaults to window.location.origin) — injectable for tests. */
  origin?: string
}

function storyImageUrl(origin: string, o: ShareCatchOptions): string {
  const q = new URLSearchParams({
    name: o.name,
    rating: o.rating,
    photo: o.photo,
    lang: o.lang,
    size: 'story',
  })
  return `${origin}/api/og/catch?${q.toString()}`
}

async function fetchStoryImage(origin: string, o: ShareCatchOptions): Promise<File | null> {
  try {
    const res = await fetch(storyImageUrl(origin, o))
    if (!res.ok) return null
    const blob = await res.blob()
    return new File([blob], `beerolog-catch-${o.beerId}.png`, { type: 'image/png' })
  } catch {
    return null
  }
}

export async function shareCatch(o: ShareCatchOptions): Promise<ShareOutcome> {
  const origin = o.origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const url = `${origin}/beer/${o.beerId}`
  const nav = typeof navigator !== 'undefined' ? navigator : undefined

  if (nav?.share) {
    try {
      const file = await fetchStoryImage(origin, o)
      if (file && nav.canShare?.({ files: [file] })) {
        await nav.share({ files: [file], text: o.text, url })
      } else {
        await nav.share({ text: o.text, url })
      }
      return 'shared'
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return 'dismissed'
    }
  }

  try {
    await nav?.clipboard?.writeText(`${o.text} ${url}`)
    return 'copied'
  } catch {
    return 'unavailable'
  }
}
