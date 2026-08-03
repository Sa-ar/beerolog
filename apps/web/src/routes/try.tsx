/**
 * /try — PUBLIC taste-preview quiz. Reuses <QuizStepper> with no auth gate. On
 * completion it persists the pruned answers to localStorage and calls the public
 * POST /guest-recommendations endpoint (Slice 2). A returning guest with stored
 * answers is offered a "see your results / retake" choice instead of re-running
 * the quiz. The results view here is a minimal placeholder — Slice 4 replaces it
 * with the blurred-card UI + sign-up gate.
 */

import { createFileRoute } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { getLang } from '../i18n/locale-cookie'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { capture } from '../lib/analytics'
import { Alert, Button, Card, CardContent, Heading } from '@beerolog/ui'
import { GuestResults } from '../components/GuestResults'
import { ShareArchetypeButton } from '../components/ShareArchetypeButton'
import { BeerJsonLd } from '../components/BeerJsonLd'
import { isArchetypeKey } from '../lib/archetypes'
import { QuizStepper } from '../components/QuizStepper'
import { PAGE_MAIN } from '@beerolog/shared'
import { type Answers, prunedAnswers } from '../lib/onboarding-quiz'
import {
  type GuestRecommendationsResponse,
  clearGuestAnswers,
  fetchGuestRecommendations,
  readGuestAnswers,
  writeGuestAnswers,
} from '../lib/guest-answers'

const TRY_SITE_URL = (import.meta.env.VITE_WEB_URL as string | undefined) ?? 'https://beerolog.com'

// Bilingual share meta for the want-to-try / quiz landing (#309). No per-item
// image here, so it's a text summary card; a branded og:image is a follow-up
// (no brand asset exists yet). Local copy (not i18n) since it's meta, not UI.
const TRY_OG = {
  en: {
    title: 'Your beer picks · Beerolog',
    description: 'Beers you want to try, matched to your taste.',
  },
  he: {
    title: 'הבירות שלכם · Beerolog',
    description: 'הבירות שסימנתם לניסיון, מותאמות לטעם שלכם.',
  },
} as const

// Exported for testing without a router.
export function tryHead(lang: 'en' | 'he' = getLang() === 'he' ? 'he' : 'en') {
  const { title, description } = TRY_OG[lang]
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: `${TRY_SITE_URL}/try` },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
  }
}

export const Route = createFileRoute('/try')({
  head: () => tryHead(),
  // `from=share` marks a visitor arriving from a shared /taste card, so a
  // quiz-start can be attributed to the growth loop (see quiz_start_from_share).
  validateSearch: (search: Record<string, unknown>): { from?: 'share' } =>
    search.from === 'share' ? { from: 'share' } : {},
  component: TryPage,
})

// The pre-fetch choice. Once a fetch starts, the mutation's status (loading /
// results / error) drives the screen instead.
type Phase = 'resume' | 'quiz'

function TryPage() {
  const { t } = useTranslation()
  const { from } = Route.useSearch()

  // Seed once from storage so a returning guest can skip straight to results.
  const [phase, setPhase] = useState<Phase>(() => (readGuestAnswers() ? 'resume' : 'quiz'))
  const [lastAnswers, setLastAnswers] = useState<Answers | null>(null)

  const recs = useMutation({
    mutationFn: (answers: Answers): Promise<GuestRecommendationsResponse> =>
      fetchGuestRecommendations(answers),
    onSuccess: (data) => {
      localStorage.removeItem('beerolog_try_quiz')
      if (data.archetype && isArchetypeKey(data.archetype.key)) {
        capture('archetype_revealed', { key: data.archetype.key, surface: 'try' })
      }
    },
  })

  // The fetch (loading / results / error) always wins over the pre-fetch choice.
  const showResults = recs.isSuccess
  const showLoading = recs.isPending
  const showError = recs.isError
  const showChoice = !showResults && !showLoading && !showError
  const showResume = showChoice && phase === 'resume'
  const showQuiz = showChoice && phase === 'quiz'

  // A quiz-start attributed to the share loop when the visitor arrived via a
  // shared /taste card (`referred`). Fires on each entry into the quiz view.
  useEffect(() => {
    if (showQuiz) capture('quiz_start', { surface: 'try', referred: from === 'share' })
  }, [showQuiz, from])

  function onComplete(answers: Answers) {
    capture('quiz_complete', { surface: 'try' })
    const pruned = prunedAnswers(answers)
    writeGuestAnswers(pruned)
    setLastAnswers(pruned)
    recs.mutate(pruned)
  }

  function seeStoredResults() {
    const stored = readGuestAnswers()
    if (!stored) {
      setPhase('quiz')
      return
    }
    setLastAnswers(stored)
    recs.mutate(stored)
  }

  function retake() {
    clearGuestAnswers()
    localStorage.removeItem('beerolog_try_quiz')
    setLastAnswers(null)
    recs.reset()
    setPhase('quiz')
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

      {showResume ? (
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

      {showQuiz ? (
        <QuizStepper onComplete={onComplete} storageKey="beerolog_try_quiz" />
      ) : null}

      {showLoading ? (
        <p className="text-sm text-neutral-500 animate-pulse" aria-live="polite">
          {t('try.loading')}
        </p>
      ) : null}

      {showError ? (
        <Alert
          variant="error"
          onRetry={() => lastAnswers && recs.mutate(lastAnswers)}
          retryLabel={t('common.tryAgain')}
        >
          {t('common.tryAgain')}
        </Alert>
      ) : null}

      {showResults && recs.data ? (
        <section data-testid="try-results" className="space-y-4">
          <p className="text-sm text-neutral-600" data-testid="try-unlocked-count">
            {t('try.unlocked', { count: recs.data.unlocked_count })}
          </p>
          {recs.data.archetype && isArchetypeKey(recs.data.archetype.key) ? (
            <ShareArchetypeButton
              archetypeKey={recs.data.archetype.key}
              surface="try"
              className="w-full"
            />
          ) : null}
          <BeerJsonLd beers={recs.data.results} />
          <GuestResults
            results={recs.data.results}
            unlockedCount={recs.data.unlocked_count}
          />
        </section>
      ) : null}
    </main>
  )
}
