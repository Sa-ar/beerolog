/**
 * /onboarding — captures the 7 quiz answers (PRD §Onboarding) and posts
 * them to POST /onboarding, which composes dials + embedding and persists
 * the user's BaselineTaste. Redirects to the dashboard on success.
 */

import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@beerolog/ui'
import { apiFetch } from '../lib/api-fetch'
import { onboardingSaveErrorMessage } from '../lib/user-facing-errors'

export const Route = createFileRoute('/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <OnboardingForm />
      </Show>
    </>
  )
}

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

// Values mirror the API enums (app/api_contracts.py); labels come from
// enums.<group>.<value> translation keys — never translate the wire value.
const COFFEE_OPTS: Coffee[] = ['black', 'espresso', 'hafuch', 'iced_sweet', 'none']
const WATER_OPTS: Water[] = ['still', 'light', 'strong']
const SNACK_OPTS: Snack[] = ['dark_chocolate', 'halva', 'fresh_fruit', 'milk_chocolate']
const LOVE_OPTS: Love[] = ['love', 'okay', 'avoid']
const CITRUS_OPTS: Citrus[] = ['grapefruit', 'orange', 'lemonade', 'none']

function OnboardingForm() {
  const navigate = useNavigate()
  const { t } = useTranslation()
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
      const res = await apiFetch('/onboarding', {
        method: 'POST',
        body: JSON.stringify(a),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      navigate({ to: '/' })
    } catch (e) {
      setError(onboardingSaveErrorMessage(t, e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}>
      <h1>{t('onboarding.title')}</h1>
      <p style={{ color: '#666' }}>{t('onboarding.intro')}</p>

      <Chips
        title={t('onboarding.questions.coffee')}
        group="coffee"
        options={COFFEE_OPTS}
        value={a.coffee}
        onChange={(v) => setA({ ...a, coffee: v })}
      />
      <Chips
        title={t('onboarding.questions.water')}
        group="water"
        options={WATER_OPTS}
        value={a.water}
        onChange={(v) => setA({ ...a, water: v })}
      />
      <YesNo
        title={t('onboarding.questions.novelty')}
        value={a.novelty_seeking}
        onChange={(v) => setA({ ...a, novelty_seeking: v })}
      />
      <Chips
        title={t('onboarding.questions.snack')}
        group="snack"
        options={SNACK_OPTS}
        value={a.snack}
        onChange={(v) => setA({ ...a, snack: v })}
      />
      <Chips
        title={t('onboarding.questions.sour')}
        group="love"
        options={LOVE_OPTS}
        value={a.sour_foods}
        onChange={(v) => setA({ ...a, sour_foods: v })}
      />
      <Chips
        title={t('onboarding.questions.citrus')}
        group="citrus"
        options={CITRUS_OPTS}
        value={a.citrus}
        onChange={(v) => setA({ ...a, citrus: v })}
      />
      <Chips
        title={t('onboarding.questions.smoked')}
        group="love"
        options={LOVE_OPTS}
        value={a.smoked_foods}
        onChange={(v) => setA({ ...a, smoked_foods: v })}
      />

      {error ? (
        <Alert variant="error" onRetry={() => void submit()}>
          {error}
        </Alert>
      ) : null}

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
        {submitting ? t('onboarding.saving') : t('onboarding.save')}
      </button>
    </div>
  )
}

function Chips<T extends string>({
  title,
  group,
  options,
  value,
  onChange,
}: {
  title: string
  group: string
  options: T[]
  value: T | null
  onChange: (v: T) => void
}) {
  const { t } = useTranslation()
  return (
    <section style={{ marginTop: 24 }}>
      <h2 style={{ fontSize: 18, marginBottom: 8 }}>{title}</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {options.map((opt) => {
          const selected = value === opt
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              style={{
                padding: '8px 14px',
                borderRadius: 999,
                border: selected ? '2px solid #0a7' : '1px solid #ccc',
                background: selected ? '#e6f7f0' : 'white',
                cursor: 'pointer',
              }}
            >
              {t(`enums.${group}.${opt}`)}
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
      group="common"
      options={['yes', 'no']}
      value={value === null ? null : value ? 'yes' : 'no'}
      onChange={(v) => onChange(v === 'yes')}
    />
  )
}
