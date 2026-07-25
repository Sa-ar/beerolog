// Font loader for the @vercel/og image endpoint (slice #288). Satori needs a
// real TTF/OTF ArrayBuffer (not woff2), so we fetch Rubik — which covers BOTH
// Latin and Hebrew glyphs — from Google Fonts using an old User-Agent so Google
// serves truetype. Module-cached; on any failure returns null so the endpoint
// still renders (Latin via the bundled default) instead of 500-ing.
// ponytail: one script-covering webfont fetched at runtime, no font asset in the
// repo. Swap for a bundled brand TTF if the runtime fetch ever proves flaky.
let cache: Promise<ArrayBuffer | null> | null = null

const OLD_UA =
  'Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36'

async function fetchRubik(): Promise<ArrayBuffer | null> {
  try {
    const cssResp = await fetch('https://fonts.googleapis.com/css2?family=Rubik:wght@700', {
      headers: { 'User-Agent': OLD_UA },
    })
    const css = await cssResp.text()
    const url = css.match(/src:\s*url\((.+?)\)\s*format\('(?:truetype|opentype)'\)/)?.[1]
    if (!url) return null
    const fontResp = await fetch(url)
    return await fontResp.arrayBuffer()
  } catch {
    return null
  }
}

export function loadOgFont(): Promise<ArrayBuffer | null> {
  if (!cache) cache = fetchRubik()
  return cache
}
