/**
 * /recommendations-v2 — results page for slice #77.
 *
 * Reads the last recommendations payload from sessionStorage (set by
 * /session-intent) and renders 5 beer cards with the why-line + score
 * breakdown.
 *
 * Named -v2 to coexist with the existing /results route (pre-pivot)
 * during the migration. The old route is dead after the slice/74 cleanup
 * but its file remains; this will replace it cleanly once the legacy
 * code is removed in a follow-up.
 */

import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

export const Route = createFileRoute('/recommendations-v2')({
  component: RecommendationsV2Page,
})

type Breakdown = {
  baseline_score: number
  session_score: number
  novelty_score: number
  total_score: number
  dominant_component: 'baseline' | 'session' | 'novelty_positive' | 'novelty_negative'
}

type RecommendedBeer = {
  id: string
  name: string
  brewery: string
  style: string
  abv: number
  market_tier: 'mainstream' | 'craft' | 'import'
  image_url: string | null
  why_line: string
  breakdown: Breakdown
}

type Payload = {
  results: RecommendedBeer[]
  alpha: number
  beta: number
}

function RecommendationsV2Page() {
  const [payload, setPayload] = useState<Payload | null>(null)
  const [missing, setMissing] = useState(false)
  const [showBreakdown, setShowBreakdown] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('beerolog_last_recs')
    if (!raw) {
      setMissing(true)
      return
    }
    try {
      setPayload(JSON.parse(raw) as Payload)
    } catch {
      setMissing(true)
    }
  }, [])

  if (missing) {
    return (
      <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
        <h1>No recommendations yet</h1>
        <p>Start a session at <a href="/session-intent">/session-intent</a>.</p>
      </div>
    )
  }
  if (!payload) return null

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Top 5 picks</h1>
      <p style={{ color: '#666' }}>
        Matched at α={payload.alpha.toFixed(2)}, β={payload.beta.toFixed(2)}.
        <button
          type="button"
          onClick={() => setShowBreakdown((v) => !v)}
          style={{
            marginLeft: 12, background: 'none', border: '1px solid #ccc',
            padding: '4px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
          }}
        >
          {showBreakdown ? 'Hide breakdown' : 'Show breakdown'}
        </button>
      </p>

      {payload.results.map((beer, i) => (
        <article key={beer.id} style={cardStyle}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2 style={{ margin: 0 }}>{i + 1}. {beer.name}</h2>
            <span style={tierBadgeStyle(beer.market_tier)}>{beer.market_tier}</span>
          </header>
          <div style={{ color: '#666', fontSize: 14, marginTop: 4 }}>
            {beer.brewery} · {beer.style} · {beer.abv}% ABV
          </div>
          <p style={{ marginTop: 8, fontStyle: 'italic' }}>{beer.why_line}</p>
          {showBreakdown && (
            <details open style={{ marginTop: 8, fontSize: 12, color: '#555' }}>
              <summary>score breakdown</summary>
              <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
                <li>baseline: {beer.breakdown.baseline_score.toFixed(3)}</li>
                <li>session: {beer.breakdown.session_score.toFixed(3)}</li>
                <li>novelty: {beer.breakdown.novelty_score.toFixed(3)}</li>
                <li>total: {beer.breakdown.total_score.toFixed(3)}</li>
                <li>dominant: <code>{beer.breakdown.dominant_component}</code></li>
              </ul>
            </details>
          )}
        </article>
      ))}

      <div style={{ marginTop: 24 }}>
        <a href="/session-intent" style={{ marginRight: 12 }}>Start new session</a>
      </div>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: 16,
  margin: '12px 0',
}

function tierBadgeStyle(tier: 'mainstream' | 'craft' | 'import'): React.CSSProperties {
  const colors = {
    mainstream: { bg: '#f0f0f0', fg: '#333' },
    craft: { bg: '#e8f5e9', fg: '#1b5e20' },
    import: { bg: '#e3f2fd', fg: '#0d47a1' },
  }[tier]
  return {
    background: colors.bg, color: colors.fg,
    padding: '2px 8px', borderRadius: 12, fontSize: 12,
  }
}
