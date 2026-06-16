/**
 * /onboarding — captures the 7 quiz answers (PRD §Onboarding) and posts
 * them to POST /onboarding, which composes dials + embedding and persists
 * the user's BaselineTaste. Redirects to /session-intent on success.
 */

import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

type Coffee = 'black' | 'espresso' | 'hafuch' | 'iced_sweet' | 'none'
type Water = 'still' | 'light' | 'strong'
type Snack = 'dark_chocolate' | 'halva' | 'fresh_fruit' | 'milk_chocolate'
type Love = 'love' | 'okay' | 'avoid'
type Citrus = 'grapefruit' | 'orange' | 'lemonade' | 'none'

type Answers = {
  coffee: Coffee | null
  water: Water | null
  novelty_seeking: boolean | null
  snack: Snack | null
  sour_foods: Love | null
  citrus: Citrus | null
  smoked_foods: Love | null
}

const COFFEE_OPTS: { value: Coffee; label: string }[] = [
  { value: 'black', label: 'Black' },
  { value: 'espresso', label: 'Espresso' },
  { value: 'hafuch', label: 'Hafuch' },
  { value: 'iced_sweet', label: 'Iced & sweet' },
  { value: 'none', label: "Don't drink coffee" },
]
const WATER_OPTS: { value: Water; label: string }[] = [
  { value: 'still', label: 'Still' },
  { value: 'light', label: 'Lightly fizzy' },
  { value: 'strong', label: 'Strongly fizzy' },
]
const SNACK_OPTS: { value: Snack; label: string }[] = [
  { value: 'dark_chocolate', label: 'Dark chocolate' },
  { value: 'halva', label: 'Halva' },
  { value: 'fresh_fruit', label: 'Fresh fruit' },
  { value: 'milk_chocolate', label: 'Milk chocolate' },
]
const LOVE_OPTS: { value: Love; label: string }[] = [
  { value: 'love', label: 'Love them' },
  { value: 'okay', label: "They're okay" },
  { value: 'avoid', label: 'Avoid them' },
]
const CITRUS_OPTS: { value: Citrus; label: string }[] = [
  { value: 'grapefruit', label: 'Grapefruit' },
  { value: 'orange', label: 'Orange' },
  { value: 'lemonade', label: 'Lemonade' },
  { value: 'none', label: 'None of those' },
]

function OnboardingPage() {
  const navigate = useNavigate()
  const [a, setA] = useState<Answers>({
    coffee: null,
    water: null,
    novelty_seeking: null,
    snack: null,
    sour_foods: null,
    citrus: null,
    smoked_foods: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const complete =
    a.coffee !== null &&
    a.water !== null &&
    a.novelty_seeking !== null &&
    a.snack !== null &&
    a.sour_foods !== null &&
    a.citrus !== null &&
    a.smoked_foods !== null

  async function submit() {
    if (!complete || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(a),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      navigate({ to: '/session-intent' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save your taste profile')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>Tell us how you taste</h1>
      <p style={{ color: '#666' }}>
        Seven quick picks. We use these to model your baseline so every session
        recommendation lands closer to what you actually enjoy.
      </p>

      <Chips
        title="How do you take coffee?"
        options={COFFEE_OPTS}
        value={a.coffee}
        onChange={(v) => setA({ ...a, coffee: v })}
      />
      <Chips
        title="Water style?"
        options={WATER_OPTS}
        value={a.water}
        onChange={(v) => setA({ ...a, water: v })}
      />
      <YesNo
        title="Do you like trying things you haven’t had before?"
        value={a.novelty_seeking}
        onChange={(v) => setA({ ...a, novelty_seeking: v })}
      />
      <Chips
        title="Pick a snack"
        options={SNACK_OPTS}
        value={a.snack}
        onChange={(v) => setA({ ...a, snack: v })}
      />
      <Chips
        title="Sour foods (pickles, kimchi, yogurt)?"
        options={LOVE_OPTS}
        value={a.sour_foods}
        onChange={(v) => setA({ ...a, sour_foods: v })}
      />
      <Chips
        title="Pick a citrus"
        options={CITRUS_OPTS}
        value={a.citrus}
        onChange={(v) => setA({ ...a, citrus: v })}
      />
      <Chips
        title="Smoked foods (brisket, smoked cheese)?"
        options={LOVE_OPTS}
        value={a.smoked_foods}
        onChange={(v) => setA({ ...a, smoked_foods: v })}
      />

      {error && <p style={{ color: '#b00020' }}>{error}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={!complete || submitting}
        style={{
          marginTop: 16,
          padding: '12px 24px',
          background: complete ? '#0a7' : '#ccc',
          color: 'white',
          border: 0,
          borderRadius: 8,
          fontSize: 16,
          cursor: complete && !submitting ? 'pointer' : 'not-allowed',
        }}
      >
        {submitting ? 'Saving…' : 'Save my taste profile →'}
      </button>
    </div>
  )
}

function Chips<T extends string>({
  title,
  options,
  value,
  onChange,
}: {
  title: string
  options: { value: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
}) {
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: selected ? '2px solid #0a7' : '1px solid #ccc',
                background: selected ? '#e6f7f0' : 'white',
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function YesNo({
  title,
  value,
  onChange,
}: {
  title: string
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <Chips
      title={title}
      options={[
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ]}
      value={value === null ? null : value ? 'yes' : 'no'}
      onChange={(v) => onChange(v === 'yes')}
    />
  )
}
