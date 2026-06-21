import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card } from '@beerolog/ui'
import { PAGE_SHELL_X } from '../lib/page-shell'
import { RECS_PAGE_SIZE } from '../lib/session-intent'

const CYCLE_MS = 1800

// Claude-style "thinking" line: cycles flavor/beer-style phrases while picks are
// matched. Honors prefers-reduced-motion by holding on the first phrase.
function ThinkingMessages() {
  const { t } = useTranslation()
  const phrases = t('recommendations.thinking', { returnObjects: true }) as string[]
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (phrases.length <= 1) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => setIndex((i) => (i + 1) % phrases.length), CYCLE_MS)
    return () => clearInterval(id)
  }, [phrases.length])

  return (
    <p
      key={index}
      aria-live="polite"
      className="min-h-[1.875rem] text-lg font-medium text-neutral-700 animate-[fadeIn_500ms_ease]"
    >
      {phrases[index]}
    </p>
  )
}

function RecommendationCardSkeleton({ isTopPick }: { isTopPick: boolean }) {
  return (
    <Card
      className={[
        'overflow-hidden',
        isTopPick
          ? 'border-brand-300 bg-gradient-to-br from-brand-50 via-white to-amber-50/80 shadow-md'
          : 'border-neutral-200 bg-white shadow-sm',
      ].join(' ')}
    >
      <div className="flex animate-pulse flex-col items-center gap-4 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-6">
        <div className="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start">
          <div className="h-10 w-10 rounded-full bg-neutral-200" />
          <div className="h-6 w-20 rounded-full bg-neutral-200" />
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="order-2 min-w-0 flex-1 space-y-2 sm:order-1">
              {isTopPick ? <div className="mx-auto h-3 w-16 rounded bg-neutral-200 sm:mx-0" /> : null}
              <div className="mx-auto h-6 w-48 max-w-full rounded bg-neutral-200 sm:mx-0" />
              <div className="mx-auto h-4 w-32 rounded bg-neutral-100 sm:mx-0" />
            </div>
            <div className="order-1 shrink-0 sm:order-2">
              <div className="h-20 w-20 rounded-xl bg-neutral-200 sm:h-16 sm:w-16 sm:rounded-2xl" />
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start sm:gap-2">
            <div className="h-6 w-16 rounded-full bg-neutral-100" />
            <div className="h-6 w-20 rounded-full bg-neutral-100" />
            <div className="h-6 w-14 rounded-full bg-neutral-100" />
          </div>

          <div className="w-full space-y-2">
            <div className="h-16 w-full rounded bg-neutral-100" />
            <div className="h-10 w-full rounded-lg bg-neutral-50" />
          </div>
        </div>
      </div>
    </Card>
  )
}

export function RecommendationsLoadingState() {
  const { t } = useTranslation()
  return (
    <main
      className={`${PAGE_SHELL_X} flex flex-1 flex-col gap-6 py-8 sm:gap-8 sm:py-10 md:py-12`}
      aria-busy="true"
      aria-label={t('recommendations.loadingAria')}
    >
      <section className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {t('recommendations.matchedEyebrow')}
        </p>
        <ThinkingMessages />
      </section>

      <div className="flex flex-col gap-3 sm:gap-4">
        {Array.from({ length: RECS_PAGE_SIZE }, (_, index) => (
          <RecommendationCardSkeleton key={index} isTopPick={index === 0} />
        ))}
      </div>
    </main>
  )
}
