/**
 * The `What I know` deck (issue #326): swipe to rate beers you recognize —
 * up = loved, right = fine, left = not-for-me, down = don't-know — on the shared
 * image-forward card, with on-screen button equivalents + undo (WCAG 2.5.1). Data +
 * progression live in useRateDeck; each swipe posts to /ratings immediately.
 * The deck is ranked by recognition likelihood (mainstream first). A search
 * mode is retained as a secondary affordance on the /rate route.
 */
import { RATINGS, type Rating } from '@beerolog/types'
import { Button, Heading, buttonVariants } from '@beerolog/ui'
import { Link } from '@tanstack/react-router'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { capture } from '../lib/analytics'
import { PAGE_SHELL_X } from '@beerolog/shared'
import { useRateDeck } from '../lib/rate-deck'
import { useSwipeCard } from '../lib/use-swipe-card'
import { knowRatingForDirection, resolveKnowSwipe } from '../lib/swipe-know'
import { SwipeBeerCard } from './SwipeBeerCard'

function Shell({ children, subtitle }: { children: React.ReactNode; subtitle?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className={`mx-auto max-w-md py-8 text-center ${PAGE_SHELL_X}`}>
      <Heading className="text-2xl">{t('rate.title')}</Heading>
      {subtitle ? <p className="mt-2 text-sm text-neutral-600">{t('rate.subtitle')}</p> : null}
      <div className="mt-6">{children}</div>
    </div>
  )
}

const STAMPS: { rating: Rating; position: string; labelKey: string }[] = [
  { rating: RATINGS.loved, position: 'left-1/2 top-6 -translate-x-1/2 border-green-400 text-green-200', labelKey: 'rate.tapper.loved' },
  { rating: RATINGS.fine, position: 'end-4 top-1/2 -translate-y-1/2 border-brand-400 text-brand-200', labelKey: 'rate.tapper.fine' },
  { rating: RATINGS.disliked, position: 'start-4 top-1/2 -translate-y-1/2 border-red-400 text-red-200', labelKey: 'rate.tapper.disliked' },
  { rating: RATINGS.unknown, position: 'left-1/2 bottom-6 -translate-x-1/2 border-neutral-400 text-neutral-200', labelKey: 'rate.dontKnow' },
]

export function RateDeckFlow() {
  const { t, i18n } = useTranslation()
  const rtl = i18n.dir() === 'rtl'
  const { state, rate, undo, restart, saveError } = useRateDeck()

  // Lock body scroll while rating so up/down swipes rate the card instead of
  // scrolling the page.
  useEffect(() => {
    if (state.status !== 'rating') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [state.status])

  const resolve = useCallback(
    (dx: number, dy: number, threshold: number) => resolveKnowSwipe(dx, dy, threshold, rtl),
    [rtl],
  )
  const track = (r: Rating) => {
    capture('beer_swiped', { direction: r, deck: 'know' })
    rate(r)
  }
  const { state: swipe, handlers } = useSwipeCard<Rating>(track, resolve)

  if (state.status === 'loading') {
    return <Shell subtitle>{t('rate.loading')}</Shell>
  }
  if (state.status === 'error') {
    return (
      <Shell>
        <p role="alert">{t('rate.error')}</p>
        <Button className="mt-4" onClick={restart}>
          {t('common.tryAgain')}
        </Button>
      </Shell>
    )
  }
  if (state.status === 'empty') {
    return (
      <Shell>
        <p>{t('rate.empty')}</p>
        <Link to="/recommendations" className="mt-3 inline-block text-brand-600 underline">
          {t('rate.backToRecs')}
        </Link>
      </Shell>
    )
  }
  if (state.status === 'done') {
    return (
      <Shell>
        <p role="status" className="text-lg font-semibold">
          {t('rate.done')}
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          {t('rate.doneDetail', { count: state.count })}
        </p>
        {saveError ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {t('rate.saveWarning')}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col items-center gap-3">
          <Link to="/recommendations" className={buttonVariants()}>
            {t('rate.seeRecs')}
          </Link>
          <Button variant="outline" onClick={restart}>
            {t('rate.rateMore')}
          </Button>
        </div>
      </Shell>
    )
  }

  const beer = state.deck[state.index]!
  const total = state.deck.length
  const liveRating = knowRatingForDirection(swipe.direction, rtl)
  const transform = `translate(${swipe.dx}px, ${swipe.dy}px) rotate(${swipe.dx / 24}deg)`

  return (
    <div className={`mx-auto flex h-full w-full max-w-md flex-col gap-3 px-4 pb-4 ${PAGE_SHELL_X}`}>
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={undo} disabled={state.index === 0}>
          {t('rate.undo')}
        </Button>
        <span className="text-xs font-medium text-neutral-400" aria-live="polite">
          {state.index + 1}/{total}
        </span>
        <span className="w-12" aria-hidden />
      </div>

      <div className="relative min-h-[24rem] flex-1">
        {STAMPS.map((s) => (
          <span
            key={s.rating}
            aria-hidden
            className={`pointer-events-none absolute z-10 rounded-xl border-2 bg-black/50 px-3 py-1 text-sm font-bold uppercase tracking-wide ${s.position}`}
            style={{ opacity: liveRating === s.rating ? swipe.progress : 0 }}
          >
            {t(s.labelKey)}
          </span>
        ))}
        <div
          {...handlers}
          style={{ transform, touchAction: 'none' }}
          className={`h-full ${
            swipe.dragging ? '' : 'transition-transform duration-200 motion-reduce:transition-none'
          }`}
        >
          <SwipeBeerCard key={beer.id} beer={beer} />
        </div>
      </div>

      <div className="flex flex-col gap-2" role="group" aria-label={t('rate.swipeHint')}>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" className="flex-1" onClick={() => track(RATINGS.disliked)}>
            {t('rate.tapper.disliked')}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => track(RATINGS.fine)}>
            {t('rate.tapper.fine')}
          </Button>
          <Button variant="default" className="flex-1" onClick={() => track(RATINGS.loved)}>
            {t('rate.tapper.loved')}
          </Button>
        </div>
        <Button variant="ghost" className="w-full" onClick={() => track(RATINGS.unknown)}>
          {t('rate.dontKnow')}
        </Button>
      </div>
    </div>
  )
}
