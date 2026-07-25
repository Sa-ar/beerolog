/**
 * GET /api/og/taste/$key?lang=he|en&size=story|og — server-rendered social image
 * for a taste archetype (slice #288). `story` = 1080×1920 (IG Stories), `og` =
 * 1200×630 (link previews). Pure function of its params → long-lived immutable
 * cache. Reuses the slice-2 archetype metadata.
 */
import { createFileRoute } from '@tanstack/react-router'
import { ImageResponse } from '@vercel/og'
import {
  ARCHETYPES,
  archetypeNameKey,
  archetypeTaglineKey,
  archetypeTraitsKey,
} from '../lib/archetypes'
import { createI18n } from '../i18n'
import { dirFor } from '../i18n/locale-cookie'
import { loadOgFont } from '../lib/og-font'
import { parseOgParams, type OgSize } from '../lib/og-image'

const ESPRESSO = 'hsl(26 24% 9%)'
const CREAM = 'hsl(44 46% 93%)'
const CREAM_MUTED = 'hsl(40 28% 78%)'
const GOLD = 'hsl(30 75% 70%)'
const FRAME = 'hsl(30 60% 40%)'

// base64 of the archetype SVG so Satori can render it as an <img>. btoa exists
// in both the edge and node serverless runtimes.
function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

// Fully presentational: all copy is resolved from i18n in the handler and passed
// in, so this stays a pure Satori layout with no i18n/archetype lookups.
function OgCard({
  icon,
  size,
  dir,
  name,
  tagline,
  traits,
  cta,
}: {
  icon: string
  size: OgSize
  dir: 'rtl' | 'ltr'
  name: string
  tagline: string
  traits: string[]
  cta: string
}) {
  const isStory = size === 'story'
  const iconSize = isStory ? 340 : 200

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
      <div style={{ display: 'flex', color: GOLD, fontSize: isStory ? 44 : 30, marginBottom: 24 }}>
        Beerolog
      </div>
      <div
        style={{
          display: 'flex',
          padding: 28,
          borderRadius: 40,
          backgroundColor: CREAM,
          border: `4px solid ${FRAME}`,
          marginBottom: 40,
        }}
      >
        <img src={svgDataUri(icon)} width={iconSize} height={iconSize} alt="" />
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: isStory ? 96 : 68,
          fontWeight: 700,
          lineHeight: 1.05,
          marginBottom: 24,
        }}
      >
        {name}
      </div>
      <div
        style={{
          display: 'flex',
          fontSize: isStory ? 44 : 32,
          color: CREAM_MUTED,
          maxWidth: isStory ? 760 : 900,
          marginBottom: 40,
        }}
      >
        {tagline}
      </div>
      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        {traits.map((trait) => (
          <div
            key={trait}
            style={{
              display: 'flex',
              fontSize: isStory ? 36 : 26,
              color: GOLD,
              border: `2px solid ${FRAME}`,
              borderRadius: 999,
              padding: isStory ? '10px 28px' : '6px 20px',
            }}
          >
            {trait}
          </div>
        ))}
      </div>
      {isStory ? (
        <div style={{ display: 'flex', marginTop: 80, fontSize: 40, color: GOLD }}>{cta}</div>
      ) : null}
    </div>
  )
}

export const Route = createFileRoute('/api/og/taste/$key')({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const parsed = parseOgParams(params.key, request.url)
        if (!parsed) return new Response('Unknown archetype', { status: 404 })
        const { key, lang, size, width, height } = parsed

        // Resolve copy from i18n server-side (no react context here).
        const t = createI18n(lang).getFixedT(lang)
        const traits = t(archetypeTraitsKey(key), { returnObjects: true }) as string[]

        const font = await loadOgFont()
        // Pure function of (key, lang, size) → cache hard at the edge forever.
        const headers = { 'Cache-Control': 'public, no-transform, immutable, max-age=31536000' }
        const base = { width, height, headers }
        return new ImageResponse(
          <OgCard
            icon={ARCHETYPES[key].icon}
            size={size}
            dir={dirFor(lang)}
            name={t(archetypeNameKey(key))}
            tagline={t(archetypeTaglineKey(key))}
            traits={traits}
            cta={t('archetypeOg.cta')}
          />,
          font
            ? { ...base, fonts: [{ name: 'Rubik', data: font, weight: 700 as const, style: 'normal' as const }] }
            : base,
        )
      },
    },
  },
})
