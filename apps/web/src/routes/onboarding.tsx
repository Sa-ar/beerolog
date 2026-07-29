/**
 * /onboarding — adaptive taste quiz. Walks the pure question graph
 * (lib/onboarding-quiz) one question at a time via <QuizStepper>, then posts the
 * answers to POST /onboarding, which composes dials + persona + embedding and
 * persists the user's BaselineTaste. Redirects to recommendations on success.
 */

import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { capture } from '../lib/analytics'
import { Alert, Heading } from '@beerolog/ui'
import { apiFetch } from '@beerolog/shared'
import { QuizStepper } from '../components/QuizStepper'
import { PAGE_MAIN } from '@beerolog/shared'
import { type Answers, prunedAnswers } from '../lib/onboarding-quiz'
import { onboardingSaveErrorMessage } from '@beerolog/shared'

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

  // The signed-in taste quiz has no share referral; surface tells the two flows apart.
  useEffect(() => capture('quiz_start', { surface: 'onboarding', referred: false }), [])

  async function submit(answers: Answers) {
    if (submitting) return
    capture('quiz_complete', { surface: 'onboarding' })
    setSubmitting(true)
    setError(null)
    try {
      const res = await apiFetch('/onboarding', {
        method: 'POST',
        body: JSON.stringify(prunedAnswers(answers)),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      localStorage.removeItem('beerolog_onboarding_quiz')
      // After the taste quiz, land on the main dashboard (home) so the user sees
      // their taste profile (radar + persona), not straight into recommendations.
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
        <Heading className="text-2xl sm:text-3xl">{t('onboarding.title')}</Heading>
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
