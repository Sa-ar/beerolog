/**
 * /onboarding — adaptive taste quiz. Walks the pure question graph
 * (lib/onboarding-quiz) one question at a time via <QuizStepper>, then posts the
 * answers to POST /onboarding, which composes dials + persona + embedding and
 * persists the user's BaselineTaste. Redirects to the dashboard on success.
 */

import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@beerolog/ui'
import { apiFetch } from '../lib/api-fetch'
import { QuizStepper } from '../components/QuizStepper'
import { PAGE_MAIN } from '../lib/page-shell'
import { type Answers, prunedAnswers } from '../lib/onboarding-quiz'
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
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(answers: Answers) {
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiFetch('/onboarding', {
        method: 'POST',
        body: JSON.stringify(prunedAnswers(answers)),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      localStorage.removeItem('beerolog_onboarding_quiz')
      navigate({ to: '/' })
    } catch (e) {
      setError(onboardingSaveErrorMessage(t, e))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={`${PAGE_MAIN} py-6 sm:py-10`}>
      <section className="mb-4 space-y-1 sm:mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">
          {t('onboarding.eyebrow')}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          {t('onboarding.title')}
        </h1>
        <p className="text-neutral-600">{t('onboarding.intro')}</p>
      </section>

      <QuizStepper
        onComplete={(answers) => void submit(answers)}
        completing={submitting}
        storageKey="beerolog_onboarding_quiz"
      >
        {error ? <Alert variant="error">{error}</Alert> : null}
      </QuizStepper>
    </main>
  )
}
