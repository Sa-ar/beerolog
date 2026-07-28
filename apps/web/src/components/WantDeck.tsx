/**
 * `What I want` swipe deck (issues #323, #324, #327). One image-forward card per
 * viewport; swipe right = want, left = pass, up = must-try, each with an
 * on-screen button equivalent + undo (WCAG 2.5.1). Renders a generic DeckCard so
 * both the recommendations feed and menu-scan results (scoped deck) reuse it.
 * Batch preload via onNearEnd; a menu-scan action (onScan) scopes the deck.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@beerolog/ui'
import { WANT_DECK_PRELOAD_AT } from '../lib/session-intent'
import { useSwipeCard } from '../lib/use-swipe-card'
import { resolveWantSwipe, wantActionForDirection, type WantAction } from '../lib/swipe-want'
import type { BeerColor } from '../lib/beer-color'
import { SwipeBeerCard } from './SwipeBeerCard'

/** A ready-to-render deck card: card fields + a precomputed match % and why. */
export type DeckCard = {
  id: string
  name: string
  name_hebrew?: string | null
  brewery: string
  style: string
  abv: number
  image_url?: string | null
  color?: BeerColor | null
  matchPercent?: number | null
  why?: string | null
}

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
  hasMore = false,
  onNearEnd,
  endCard,
  onOpenRefiner,
  onScan,
  resetKey,
}: {
  beers: DeckCard[]
  onSignal?: (beerId: string, action: WantAction) => void
  /** More batches are available; suppresses the terminal card while preloading. */
  hasMore?: boolean
  /** Fired when the remaining cards hit the preload threshold. */
  onNearEnd?: () => void
  /** Terminal card shown when the deck is exhausted and nothing more is loading. */
  endCard?: ReactNode
  /** Opens the refiner bottom sheet (header filter button). */
  onOpenRefiner?: () => void
  /** Opens the menu-scan action (header camera button). */
  onScan?: () => void
  /** Changes when the deck is re-queried (refiner change / scope change) so the
   * index resets; stable across preloaded batches so the position is kept. */
  resetKey?: string
}) {
  const { t, i18n } = useTranslation()
  const rtl = i18n.dir() === 'rtl'
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  useEffect(() => {
    setIndex(0)
  }, [resetKey])

  const commit = useCallback(
    (action: WantAction) => {
      const card = beers[index]
      if (!card) return
      // ponytail: swipe signal only; the typed `beer_swiped` analytics event
      // lands in Slice 8 (#329). Persistence is wired via onSignal (#325).
      onSignal?.(card.id, action)
      setIndex((i) => i + 1)
    },
    [beers, index, onSignal],
  )

  const resolve = useCallback(
    (dx: number, dy: number, threshold: number) => resolveWantSwipe(dx, dy, threshold, rtl),
    [rtl],
  )
  const { state, handlers } = useSwipeCard<WantAction>(commit, resolve)

  const remaining = beers.length - index
  useEffect(() => {
    if (hasMore && onNearEnd && remaining <= WANT_DECK_PRELOAD_AT) onNearEnd()
  }, [hasMore, onNearEnd, remaining])

  const card = beers[index]
  if (!card) {
    if (hasMore) {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-neutral-400 animate-pulse">{t('whatIWant.loadingMore')}</p>
        </div>
      )
    }
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        {endCard ?? (
          <p role="status" className="text-lg font-semibold">
            {t('whatIWant.empty')}
          </p>
        )}
      </div>
    )
  }

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
        <div className="flex items-center gap-1">
          {onScan ? (
            <Button variant="ghost" size="sm" onClick={onScan}>
              {t('whatIWant.scan')}
            </Button>
          ) : null}
          {onOpenRefiner ? (
            <Button variant="ghost" size="sm" onClick={onOpenRefiner}>
              {t('whatIWant.refine')}
            </Button>
          ) : null}
        </div>
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
          <SwipeBeerCard
            beer={card}
            matchPercent={card.matchPercent ?? null}
            why={card.why ?? null}
          />
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
