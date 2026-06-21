/**
 * /onboarding — adaptive taste quiz. Walks the pure question graph
 * (lib/onboarding-quiz) one question at a time, then posts the answers to
 * POST /onboarding, which composes dials + persona + embedding and persists the
 * user's BaselineTaste. Redirects to the dashboard on success.
 */

import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Card, CardContent } from '@beerolog/ui'
import { apiFetch } from '../lib/api-fetch'
import { QuizChips } from '../components/QuizChips'
import { PAGE_MAIN } from '../lib/page-shell'
import {
  type Answers,
  type QuestionDef,
  nextQuestion,
  progress,
  prunedAnswers,
} from '../lib/onboarding-quiz'
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

function OnboardingForm() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [a, setA] = useState<Answers>({})
  const [history, setHistory] = useState<(keyof Answers)[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const current = nextQuestion(a)
  const { step, total } = progress(a)

  function commit(field: keyof Answers, value: Answers[keyof Answers]) {
    setA((prev) => ({ ...prev, [field]: value }))
    setHistory((h) => [...h, field])
  }

  function back() {
    const last = history[history.length - 1]
    if (!last) return
    setA((prev) => {
      const next = { ...prev }
      delete next[last]
      return next
    })
    setHistory((h) => h.slice(0, -1))
    setError(null)
  }

  async function submit() {
    if (current !== null || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiFetch('/onboarding', {
        method: 'POST',
        body: JSON.stringify(prunedAnswers(a)),
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
    <main className={`${PAGE_MAIN} py-8 sm:py-10`}>
      <section className="mb-6 space-y-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {t('onboarding.eyebrow')}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          {t('onboarding.title')}
        </h1>
        <p className="text-neutral-600">{t('onboarding.intro')}</p>
      </section>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <p className="text-xs font-medium text-neutral-500" aria-live="polite">
            {t('onboarding.progress', { step, total })}
          </p>

          {current === null ? (
            <div className="space-y-4">
              <p className="text-lg font-medium text-neutral-900">
                {t('onboarding.readyHeadline')}
              </p>
              {error ? (
                <Alert variant="error" onRetry={() => void submit()}>
                  {error}
                </Alert>
              ) : null}
              <Button size="lg" disabled={submitting} onClick={() => void submit()}>
                {submitting ? t('onboarding.saving') : t('onboarding.save')}
              </Button>
            </div>
          ) : current.type === 'multi' ? (
            <MultiQuestion key={current.id} q={current} onCommit={commit} />
          ) : (
            <SingleQuestion key={current.id} q={current} onCommit={commit} />
          )}

          {history.length > 0 ? (
            <button
              type="button"
              onClick={back}
              className="text-sm font-medium text-neutral-500 underline-offset-2 hover:underline"
            >
              {t('onboarding.back')}
            </button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  )
}

function SingleQuestion({
  q,
  onCommit,
}: {
  q: QuestionDef
  onCommit: (field: keyof Answers, value: Answers[keyof Answers]) => void
}) {
  const { t } = useTranslation()
  return (
    <QuizChips
      title={t(`onboarding.questions.${q.id}`)}
      group={q.group}
      options={q.options}
      value={null}
      onChange={(v) => onCommit(q.field, v as Answers[keyof Answers])}
    />
  )
}

function MultiQuestion({
  q,
  onCommit,
}: {
  q: QuestionDef
  onCommit: (field: keyof Answers, value: Answers[keyof Answers]) => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>([])

  function toggle(option: string) {
    setSelected((s) => (s.includes(option) ? s.filter((o) => o !== option) : [...s, option]))
  }

  return (
    <div role="group" aria-label={t(`onboarding.questions.${q.id}`)} className="space-y-3">
      <p className="font-medium text-neutral-900">{t(`onboarding.questions.${q.id}`)}</p>
      <div className="flex flex-wrap gap-2">
        {q.options.map((option) => {
          const on = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(option)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? 'border-amber-700 bg-amber-700 text-white'
                  : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-50'
              }`}
            >
              {t(`enums.${q.group}.${option}`)}
            </button>
          )
        })}
      </div>
      <div className="flex gap-3">
        <Button size="md" onClick={() => onCommit(q.field, selected)}>
          {t('onboarding.continue')}
        </Button>
        {q.optional ? (
          <Button size="md" variant="outline" onClick={() => onCommit(q.field, [])}>
            {t('onboarding.skip')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
