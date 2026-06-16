/**
 * /session-intent — the per-session quick-pick UI (slice #77).
 *
 * Two one-tap picks (vibe + abv_intent) + optional free-text. Posts the
 * combined intent + a placeholder baseline to POST /recommendations
 * and routes to /recommendations for the results page.
 *
 * English copy only — Hebrew translation is HITL.
 * The placeholder baseline is a stand-in until slice #76's onboarding
 * flow is wired to the web; until then, this page lets a maintainer
 * smoke-test the full results render.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api-fetch'

type Baseline = {
  bubbles: number
  bitterness: number
  flavor_family: Record<string, number>
  novelty_affinity: number
}

export const Route = createFileRoute('/session-intent')({
  component: SessionIntentPage,
})

type Vibe = 'refreshing' | 'cozy' | 'adventurous' | 'familiar'
type AbvIntent = 'low' | 'medium' | 'high' | 'any'

const VIBE_OPTIONS: { value: Vibe; label: string; hint: string }[] = [
  { value: 'refreshing', label: 'Refreshing', hint: 'crisp and easy' },
  { value: 'cozy', label: 'Cozy', hint: 'warming and rich' },
  { value: 'adventurous', label: 'Adventurous', hint: 'try something new' },
  { value: 'familiar', label: 'Familiar', hint: 'comforting and known' },
]

const ABV_OPTIONS: { value: AbvIntent; label: string; hint: string }[] = [
  { value: 'low', label: 'Low', hint: '≤4.5%' },
  { value: 'medium', label: 'Medium', hint: '4.5–6.5%' },
  { value: 'high', label: 'High', hint: '6.5%+' },
  { value: 'any', label: 'Any', hint: 'no preference' },
]

function SessionIntentPage() {
  const navigate = useNavigate()
  const [vibe, setVibe] = useState<Vibe | null>(null)
  const [abv, setAbv] = useState<AbvIntent | null>(null)
  const [freeText, setFreeText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [baseline, setBaseline] = useState<Baseline | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/me/baseline-taste')
        if (res.status === 404) {
          if (!cancelled) navigate({ to: '/onboarding' })
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as Baseline
        if (!cancelled) setBaseline(data)
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : 'Failed to load your taste profile')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [navigate])

  const canSubmit = vibe !== null && abv !== null && !submitting && baseline !== null

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        baseline,
        session: { vibe, abv_intent: abv, free_text: freeText },
      }
      const res = await apiFetch('/recommendations', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      sessionStorage.setItem('beerolog_last_recs', JSON.stringify(data))
      navigate({ to: '/recommendations-v2' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to get recommendations')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>What do you feel like tonight?</h1>
      <p style={{ color: '#666' }}>
        Pick two, optionally add a sentence. We'll suggest 5 beers.
      </p>

      <section>
        <h2>Vibe</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {VIBE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setVibe(opt.value)}
              style={chipStyle(vibe === opt.value)}
            >
              <div>{opt.label}</div>
              <small style={{ opacity: 0.7 }}>{opt.hint}</small>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>ABV intent</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ABV_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAbv(opt.value)}
              style={chipStyle(abv === opt.value)}
            >
              <div>{opt.label}</div>
              <small style={{ opacity: 0.7 }}>{opt.hint}</small>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 24 }}>
        <h2>Tell me more (optional)</h2>
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={3}
          placeholder="hot evening, just ate hummus…"
          style={{
            width: '100%', padding: 8, fontSize: 16,
            border: '1px solid #ccc', borderRadius: 4,
          }}
        />
        <small style={{ color: '#666' }}>Hebrew is fine too.</small>
      </section>

      {error && (
        <div role="alert" style={{ marginTop: 16, color: 'crimson' }}>{error}</div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit}
        style={{
          marginTop: 24, padding: '12px 24px', fontSize: 16,
          background: canSubmit ? '#000' : '#999',
          color: 'white', border: 'none', borderRadius: 4,
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'Picking…' : 'Get recommendations'}
      </button>
    </div>
  )
}

function chipStyle(selected: boolean): React.CSSProperties {
  return {
    padding: '12px 16px',
    border: selected ? '2px solid #000' : '1px solid #ccc',
    background: selected ? '#000' : 'white',
    color: selected ? 'white' : '#222',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    textAlign: 'left',
    minWidth: 120,
  }
}
