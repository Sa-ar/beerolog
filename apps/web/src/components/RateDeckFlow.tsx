/**
 * The /rate deck experience: fetch a deck, rate beers one at a time, batch-
 * submit on completion. Data + progression live in useRateDeck; this component
 * is presentation only.
 */
import { Button, Heading, ProgressRing, buttonVariants } from '@beerolog/ui'
import { Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { PAGE_SHELL_X } from '../lib/page-shell'
import { useRateDeck } from '../lib/rate-deck'
import { RateBeerCard } from './RateBeerCard'

function Shell({ children, subtitle }: { children: React.ReactNode; subtitle?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={`mx-auto max-w-md py-8 text-center ${PAGE_SHELL_X}`}>
      <Heading className="text-2xl">{t('rate.title', 'Rate beers')}</Heading>
      {subtitle ? <p className="mt-2 text-sm text-neutral-600">{t('rate.subtitle')}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  )
}

export function RateDeckFlow() {
  const { t } = useTranslation()
  const { state, rate, undo, restart, saveError } = useRateDeck()

  // Lock body scroll while actively rating so up/down swipes rate the card
  // instead of scrolling the page (#4).
  useEffect(() => {
    if (state.status !== 'rating') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [state.status])

  if (state.status === 'loading') {
    return <Shell subtitle>{t('rate.loading', 'Loading beers…')}</Shell>
  }
  if (state.status === 'error') {
    return (
      <Shell>
        <p role="alert">{t('rate.error', "Couldn't load the deck. Try again.")}</p>
        <Button className="mt-4" onClick={restart}>
          {t('common.tryAgain')}
        </Button>
      </Shell>
    )
  }
  if (state.status === 'empty') {
    return (
      <Shell>
        <p>{t('rate.empty', "No beers to rate right now — you've rated them all!")}</p>
        <Link to="/recommendations" className="mt-3 inline-block text-brand-600 underline">
          {t('rate.backToRecs', 'Back to recommendations')}
        </Link>
      </Shell>
    )
  }
  if (state.status === 'done') {
    return (
      <Shell>
        <p role="status" className="text-lg font-semibold">
          {t('rate.done', 'Thanks! Your taste profile just got sharper.')}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          {t('rate.doneDetail', { count: state.count })}
        </p>
        {saveError ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {t('rate.saveWarning', "Some ratings couldn't be saved — check your connection.")}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col items-center gap-3">
          <Link to="/recommendations" className={buttonVariants()}>
            {t('rate.seeRecs', 'See fresh recommendations')}
          </Link>
          <Button variant="outline" onClick={restart}>
            {t('rate.rateMore', 'Rate more beers')}
          </Button>
        </div>
      </Shell>
    )
  }

  const beer = state.deck[state.index]!
  const total = state.deck.length
  return (
    <Shell subtitle>
      <div className="relative mb-4 flex justify-center">
        {state.index > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            className="absolute left-0 top-1/2 -translate-y-1/2"
          >
            {t('rate.undo', 'Undo last')}
          </Button>
        ) : null}
        <ProgressRing value={state.index} max={total} label={`${state.index + 1}/${total}`} />
      </div>
      <RateBeerCard key={beer.id} beer={beer} onRate={rate} />
    </Shell>
  )
}
