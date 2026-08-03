/**
 * GET /api/og/collection?name=&caught=&total=&lang=&size= — the "catch 'em all"
 * collection-brag image (issue #334). Shown when a Set is complete. Mirrors the
 * catch OG route; pure function of its query -> immutable cache.
 */
import { createFileRoute } from '@tanstack/react-router'
import { createI18n } from '../i18n'
import { dirFor } from '../i18n/locale-cookie'
import { loadOgFont } from '../lib/og-font'
import { parseCollectionOgParams } from '../lib/og-collection'
import type { OgSize } from '../lib/og-image'

const ESPRESSO = 'hsl(26 24% 9%)'
const CREAM = 'hsl(44 46% 93%)'
const GOLD = 'hsl(43 80% 70%)'
const FRAME = 'hsl(40 62% 40%)'

function CollectionCard({
  size,
  dir,
  name,
  count,
  title,
  cta,
}: {
  size: OgSize
  dir: 'rtl' | 'ltr'
  name: string
  count: string
  title: string
  cta: string
}) {
  const isStory = size === 'story'
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        backgroundColor: ESPRESSO,
        color: CREAM,
        fontFamily: 'Rubik',
        padding: isStory ? '120px 80px' : '48px 72px',
        textAlign: 'center',
        direction: dir,
      }}
    >
      <div style={{ display: 'flex', color: GOLD, fontSize: isStory ? 52 : 34, marginBottom: 28 }}>
        {title}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: isStory ? 92 : 64,
          fontWeight: 700,
          lineHeight: 1.05,
          marginBottom: 32,
        }}
      >
        {name}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: isStory ? 120 : 84,
          fontWeight: 700,
          color: GOLD,
          border: `4px solid ${FRAME}`,
          borderRadius: 32,
          padding: isStory ? '20px 56px' : '12px 40px',
        }}
      >
        {count}
      </div>
      {isStory ? (
        <div style={{ display: 'flex', marginTop: 80, fontSize: 40, color: GOLD }}>{cta}</div>
      ) : null}
    </div>
  )
}

export const Route = createFileRoute('/api/og/collection')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const parsed = parseCollectionOgParams(request.url)
        if (!parsed) return new Response('Missing set', { status: 404 })
        const t = createI18n(parsed.lang).getFixedT(parsed.lang)

        const font = await loadOgFont()
        const og = await import('@vercel/og').catch(() => null)
        if (!og) return new Response('OG image temporarily unavailable', { status: 503 })
        const headers = { 'Cache-Control': 'public, no-transform, immutable, max-age=31536000' }
        const base = { width: parsed.width, height: parsed.height, headers }
        return new og.ImageResponse(
          <CollectionCard
            size={parsed.size}
            dir={dirFor(parsed.lang)}
            name={parsed.name}
            count={`${parsed.caught}/${parsed.total}`}
            title={t('collectionOg.title')}
            cta={t('collectionOg.cta')}
          />,
          font
            ? { ...base, fonts: [{ name: 'Rubik', data: font, weight: 700 as const, style: 'normal' as const }] }
            : base,
        )
      },
    },
  },
})
