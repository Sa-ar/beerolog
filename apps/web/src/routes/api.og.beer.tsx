/**
 * GET /api/og/beer?id= — server-rendered branded share card for a beer page
 * (#277). Fetches the public catalog beer and renders a card via @vercel/og +
 * the bundled Rubik font (#316). Mirrors the catch/taste OG routes.
 */
import { createFileRoute } from '@tanstack/react-router'
import { loadOgFont } from '../lib/og-font'
import { beerOgSubtitle } from '../lib/og-beer'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'
const ESPRESSO = 'hsl(26 24% 9%)'
const CREAM = 'hsl(44 46% 93%)'
const GOLD = 'hsl(43 80% 70%)'
const FRAME = 'hsl(40 62% 40%)'

type Beer = { name: string; brewery: string; style: string; abv: number; image_url?: string | null }

function BeerCard({ beer }: { beer: Beer }) {
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
        padding: '48px 72px',
        textAlign: 'center',
      }}
    >
      {beer.image_url ? (
        <img
          src={beer.image_url}
          width={280}
          height={280}
          style={{ objectFit: 'cover', borderRadius: 28, border: `4px solid ${FRAME}`, marginBottom: 28 }}
          alt=""
        />
      ) : null}
      <div style={{ display: 'flex', fontSize: 68, fontWeight: 700, lineHeight: 1.05, marginBottom: 16 }}>
        {beer.name}
      </div>
      <div style={{ display: 'flex', fontSize: 32, color: GOLD }}>{beerOgSubtitle(beer)}</div>
      <div style={{ display: 'flex', marginTop: 40, fontSize: 30, color: GOLD }}>Beerolog</div>
    </div>
  )
}

export const Route = createFileRoute('/api/og/beer')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = new URL(request.url).searchParams.get('id')
        if (!id) return new Response('Missing id', { status: 404 })
        const res = await fetch(`${API_URL}/catalog/${encodeURIComponent(id)}`).catch(() => null)
        if (!res || !res.ok) return new Response('Beer not found', { status: 404 })
        const beer = (await res.json()) as Beer

        const font = await loadOgFont()
        // Lazy-load @vercel/og inside the handler (prod-outage lesson).
        const og = await import('@vercel/og').catch(() => null)
        if (!og) return new Response('OG image temporarily unavailable', { status: 503 })
        const headers = { 'Cache-Control': 'public, no-transform, immutable, max-age=31536000' }
        const base = { width: 1200, height: 630, headers }
        return new og.ImageResponse(
          <BeerCard beer={beer} />,
          font
            ? { ...base, fonts: [{ name: 'Rubik', data: font, weight: 700 as const, style: 'normal' as const }] }
            : base,
        )
      },
    },
  },
})
