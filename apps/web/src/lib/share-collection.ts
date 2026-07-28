import type { Lang } from '../i18n/locale-cookie'

// Share a completed Set ("catch 'em all", issue #334). Mirrors share-catch:
// fetch the size=story brag PNG and offer it via navigator.share({ files }),
// clipboard fallback to the /try link.
export type ShareOutcome = 'shared' | 'copied' | 'dismissed' | 'unavailable'

type ShareCollectionOptions = {
  setKey: string
  name: string
  caught: number
  total: number
  lang: Lang
  text: string
  origin?: string
}

function storyImageUrl(origin: string, o: ShareCollectionOptions): string {
  const q = new URLSearchParams({
    name: o.name,
    caught: String(o.caught),
    total: String(o.total),
    lang: o.lang,
    size: 'story',
  })
  return `${origin}/api/og/collection?${q.toString()}`
}

async function fetchStoryImage(origin: string, o: ShareCollectionOptions): Promise<File | null> {
  try {
    const res = await fetch(storyImageUrl(origin, o))
    if (!res.ok) return null
    const blob = await res.blob()
    return new File([blob], `beerolog-set-${o.setKey}.png`, { type: 'image/png' })
  } catch {
    return null
  }
}

export async function shareCollection(o: ShareCollectionOptions): Promise<ShareOutcome> {
  const origin = o.origin ?? (typeof window !== 'undefined' ? window.location.origin : '')
  const url = `${origin}/try`
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
