/**
 * `What I want` swipe deck (issue #323). One image-forward card per viewport;
 * swipe right = want, left = pass, up = must-try, each with an on-screen button
 * equivalent + undo (WCAG 2.5.1). Swipes post a signal immediately; the
 * persisted Want-to-try list is stubbed here and landed in Slice 4 (#325).
 * Batch paging + refiners land in Slice 3 (#324).
 */
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@beerolog/ui'
import { DEFAULT_MATCH_CALIBRATION, tonightMatchPercent } from '../lib/match-score'
import { useSwipeCard } from '../lib/use-swipe-card'
import { resolveWantSwipe, wantActionForDirection, type WantAction } from '../lib/swipe-want'
import type { RecommendedBeer } from './RecommendationBeerCard'
import { SwipeBeerCard } from './SwipeBeerCard'

const STAMP_POSITION: Record<WantAction, string> = {
  want: 'end-4 top-1/2 -translate-y-1/2 border-green-400 text-green-200',
  pass: 'start-4 top-1/2 -translate-y-1/2 border-red-400 text-red-200',
  must_try: 'left-1/2 top-6 -translate-x-1/2 border-brand-400 text-brand-200',
}

const STAMP_LABEL: Record<WantAction, string> = {
  want: 'whatIWant.want',
  pass: 'whatIWant.pass',
  must_try: 'whatIWant.superLike',
}

export function WantDeck({
  beers,
  onSignal,
}: {
  beers: RecommendedBeer[]
  onSignal?: (beerId: string, action: WantAction) => void
}) {
  const { t, i18n } = useTranslation()
  const rtl = i18n.dir() === 'rtl'
  const [index, setIndex] = useState(0)

  // Least-scroll: swipe replaces scroll, so keep the page from scrolling under
  // an up/down drag while the deck is mounted.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const commit = useCallback(
    (action: WantAction) => {
      const beer = beers[index]
      if (!beer) return
      // ponytail: swipe signal only for now; the typed `beer_swiped` analytics
      // event and the persisted Want-to-try write land in Slices 9 (#329) and 4 (#325).
      onSignal?.(beer.id, action)
      setIndex((i) => i + 1)
    },
    [beers, index, onSignal],
  )

  const resolve = useCallback(
    (dx: number, dy: number, threshold: number) => resolveWantSwipe(dx, dy, threshold, rtl),
    [rtl],
  )
  const { state, handlers } = useSwipeCard<WantAction>(commit, resolve)

  const beer = beers[index]
  if (!beer) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p role="status" className="text-lg font-semibold">
          {t('whatIWant.empty')}
        </p>
      </div>
    )
  }

  const matchPercent = tonightMatchPercent(beer.breakdown, false, DEFAULT_MATCH_CALIBRATION, 0.3)
  const liveAction = wantActionForDirection(state.direction, rtl)
  const transform = `translate(${state.dx}px, ${state.dy}px) rotate(${state.dx / 24}deg)`

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col gap-3 px-4 pb-4">
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          {t('whatIWant.undo')}
        </Button>
        <span className="text-xs font-medium text-neutral-400" aria-live="polite">
          {t('whatIWant.progress', { current: index + 1, total: beers.length })}
        </span>
      </div>

      <div className="relative min-h-0 flex-1">
        {(Object.keys(STAMP_POSITION) as WantAction[]).map((action) => (
          <span
            key={action}
            aria-hidden
            className={`pointer-events-none absolute z-10 rounded-xl border-2 bg-black/50 px-3 py-1 text-sm font-bold uppercase tracking-wide ${STAMP_POSITION[action]}`}
            style={{ opacity: liveAction === action ? state.progress : 0 }}
          >
            {t(STAMP_LABEL[action])}
          </span>
        ))}
        <div
          {...handlers}
          style={{ transform, touchAction: 'none' }}
          className={`h-full ${
            state.dragging ? '' : 'transition-transform duration-200 motion-reduce:transition-none'
          }`}
        >
          <SwipeBeerCard beer={beer} matchPercent={matchPercent} why={beer.why?.text ?? null} />
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-3"
        role="group"
        aria-label={t('whatIWant.swipeHint')}
      >
        <Button variant="outline" className="flex-1" onClick={() => commit('pass')}>
          {t('whatIWant.pass')}
        </Button>
        <Button variant="default" className="flex-1" onClick={() => commit('want')}>
          {t('whatIWant.want')}
        </Button>
        <Button variant="outline" className="flex-1" onClick={() => commit('must_try')}>
          {t('whatIWant.superLike')}
        </Button>
      </div>
    </div>
  )
}
