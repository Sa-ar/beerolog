/**
 * /try — PUBLIC taste-preview quiz. Reuses <QuizStepper> with no auth gate. On
 * completion it persists the pruned answers to localStorage and calls the public
 * POST /guest-recommendations endpoint (Slice 2). A returning guest with stored
 * answers is offered a "see your results / retake" choice instead of re-running
 * the quiz. The results view here is a minimal placeholder — Slice 4 replaces it
 * with the blurred-card UI + sign-up gate.
 */

import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Card, CardContent, Heading } from '@beerolog/ui'
import { GuestResults } from '../components/GuestResults'
import { ShareArchetypeButton } from '../components/ShareArchetypeButton'
import { BeerJsonLd } from '../components/BeerJsonLd'
import { isArchetypeKey } from '../lib/archetypes'
import { QuizStepper } from '../components/QuizStepper'
import { PAGE_MAIN } from '../lib/page-shell'
import { type Answers, prunedAnswers } from '../lib/onboarding-quiz'
import {
  type GuestRecommendationsResponse,
  clearGuestAnswers,
  fetchGuestRecommendations,
  readGuestAnswers,
  writeGuestAnswers,
} from '../lib/guest-answers'

export const Route = createFileRoute('/try')({
  component: TryPage,
})

type View =
  | { status: 'resume' } // stored answers exist — offer see-results / retake
  | { status: 'quiz' }
  | { status: 'loading' }
  | { status: 'results'; data: GuestRecommendationsResponse }
  | { status: 'error' }

function TryPage() {
  const { t } = useTranslation()
  // Seed once from storage so a returning guest can skip straight to results.
  const [view, setView] = useState<View>(() =>
    readGuestAnswers() ? { status: 'resume' } : { status: 'quiz' },
  )
  const [lastAnswers, setLastAnswers] = useState<Answers | null>(null)

  async function run(answers: Answers) {
    setView({ status: 'loading' })
    try {
      const data = await fetchGuestRecommendations(answers)
      localStorage.removeItem('beerolog_try_quiz')
      setView({ status: 'results', data })
    } catch {
      setView({ status: 'error' })
    }
  }

  function onComplete(answers: Answers) {
    const pruned = prunedAnswers(answers)
    writeGuestAnswers(pruned)
    setLastAnswers(pruned)
    void run(pruned)
  }

  function seeStoredResults() {
    const stored = readGuestAnswers()
    if (!stored) {
      setView({ status: 'quiz' })
      return
    }
    setLastAnswers(stored)
    void run(stored)
  }

  function retake() {
    clearGuestAnswers()
    localStorage.removeItem('beerolog_try_quiz')
    setLastAnswers(null)
    setView({ status: 'quiz' })
  }

  return (
    <main className={`${PAGE_MAIN} py-6 sm:py-10`}>
      <section className="mb-4 space-y-1 sm:mb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-300">
          {t('try.eyebrow')}
        </p>
        <Heading className="text-2xl sm:text-3xl">{t('onboarding.title')}</Heading>
        <p className="text-neutral-600">{t('try.intro')}</p>
      </section>

      {view.status === 'resume' ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-6">
            <Button size="lg" data-testid="try-see-results" onClick={seeStoredResults}>
              {t('try.seeResults')}
            </Button>
            <Button size="md" variant="outline" data-testid="try-retake" onClick={retake}>
              {t('try.retake')}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {view.status === 'quiz' ? (
        <QuizStepper onComplete={onComplete} storageKey="beerolog_try_quiz" />
      ) : null}

      {view.status === 'loading' ? (
        <p className="text-sm text-neutral-500 animate-pulse" aria-live="polite">
          {t('try.loading')}
        </p>
      ) : null}

      {view.status === 'error' ? (
        <Alert variant="error" onRetry={() => lastAnswers && void run(lastAnswers)}>
          {t('common.tryAgain')}
        </Alert>
      ) : null}

      {view.status === 'results' ? (
        <section data-testid="try-results" className="space-y-4">
          <p className="text-sm text-neutral-600" data-testid="try-unlocked-count">
            {t('try.unlocked', { count: view.data.unlocked_count })}
          </p>
          {view.data.archetype && isArchetypeKey(view.data.archetype.key) ? (
            <ShareArchetypeButton archetypeKey={view.data.archetype.key} className="w-full" />
          ) : null}
          <BeerJsonLd beers={view.data.results} />
          <GuestResults
            results={view.data.results}
            unlockedCount={view.data.unlocked_count}
          />
        </section>
      ) : null}
    </main>
  )
}
