/**
 * GET /api/og/catch?name=&rating=&photo=&lang=&size= — single-catch share image
 * (issue #332). The user's proof photo + beer name + rating + brand. Pure
 * function of its query -> immutable cache. Mirrors the taste OG route.
 */
import { createFileRoute } from '@tanstack/react-router'
import { createI18n } from '../i18n'
import { loadOgFont } from '../lib/og-font'
import { catchCardModel, parseCatchOgParams } from '../lib/og-catch'
import type { OgSize } from '../lib/og-image'

const ESPRESSO = 'hsl(26 24% 9%)'
const CREAM = 'hsl(44 46% 93%)'
const GOLD = 'hsl(43 80% 70%)'
const FRAME = 'hsl(40 62% 40%)'

function CatchCard({
  size,
  dir,
  name,
  photo,
  ratingLabel,
  caught,
  cta,
}: {
  size: OgSize
  dir: 'rtl' | 'ltr'
  name: string
  photo: string | null
  ratingLabel: string | null
  caught: string
  cta: string
}) {
  const isStory = size === 'story'
  const photoSize = isStory ? 680 : 300
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
        padding: isStory ? '120px 80px' : '40px 72px',
        textAlign: 'center',
        direction: dir,
      }}
    >
      <div style={{ display: 'flex', color: GOLD, fontSize: isStory ? 44 : 30, marginBottom: 24 }}>
        {caught}
      </div>
      <div
        style={{
          display: 'flex',
          width: photoSize,
          height: photoSize,
          borderRadius: 32,
          overflow: 'hidden',
          border: `4px solid ${FRAME}`,
          backgroundColor: CREAM,
          marginBottom: 32,
        }}
      >
        {photo ? (
          <img src={photo} width={photoSize} height={photoSize} style={{ objectFit: 'cover' }} alt="" />
        ) : null}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: isStory ? 84 : 56,
          fontWeight: 700,
          lineHeight: 1.05,
          marginBottom: 20,
        }}
      >
        {name}
      </div>
      {ratingLabel ? (
        <div
          style={{
            display: 'flex',
            fontSize: isStory ? 40 : 28,
            color: GOLD,
            border: `2px solid ${FRAME}`,
            borderRadius: 999,
            padding: isStory ? '10px 28px' : '6px 20px',
          }}
        >
          {ratingLabel}
        </div>
      ) : null}
      {isStory ? (
        <div style={{ display: 'flex', marginTop: 72, fontSize: 40, color: GOLD }}>{cta}</div>
      ) : null}
    </div>
  )
}

export const Route = createFileRoute('/api/og/catch')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const parsed = parseCatchOgParams(request.url)
        if (!parsed) return new Response('Missing catch', { status: 404 })
        const model = catchCardModel(parsed)
        const t = createI18n(parsed.lang).getFixedT(parsed.lang)
        const ratingLabel = model.ratingLabelKey ? (t(model.ratingLabelKey) as string) : null

        const font = await loadOgFont()
        // Lazy-load @vercel/og inside the handler (see taste OG route / the
        // 2026-07-28 prod outage): a module-top import ENOENTs its bundled font.
        const og = await import('@vercel/og').catch(() => null)
        if (!og) return new Response('OG image temporarily unavailable', { status: 503 })
        const headers = { 'Cache-Control': 'public, no-transform, immutable, max-age=31536000' }
        const base = { width: parsed.width, height: parsed.height, headers }
        return new og.ImageResponse(
          <CatchCard
            size={parsed.size}
            dir={model.dir}
            name={parsed.name}
            photo={parsed.photo}
            ratingLabel={ratingLabel}
            caught={t('catchOg.caught')}
            cta={t('catchOg.cta')}
          />,
          font
            ? { ...base, fonts: [{ name: 'Rubik', data: font, weight: 700 as const, style: 'normal' as const }] }
            : base,
        )
      },
    },
  },
})
