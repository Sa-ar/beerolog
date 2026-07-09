/**
 * One beer in the /rate deck: name, meta, the loved/fine/disliked tapper, and
 * an optional free-text note. Owns its own note state — parent passes
 * `key={beer.id}` so it resets between beers.
 *
 * Touch/pointer devices can also swipe the card (issue #4): right=loved,
 * left=disliked, up=fine, down=unknown, with a choice stamp that fades in with
 * the drag. The buttons remain the accessible / desktop baseline; swipe is
 * additive.
 */
import { RATINGS, type Rating } from '@beerolog/types'
import { Button, Card, Heading, RatingTapper } from '@beerolog/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DeckBeer } from '../lib/rate-deck'
import type { SwipeDirection } from '../lib/swipe-rating'
import { useSwipeCard } from '../lib/use-swipe-card'

const NOTE_MAX = 500

// Stamp per swipe direction (mirrors the tapper's emoji vocabulary).
const STAMPS: { dir: SwipeDirection; emoji: string; className: string }[] = [
  {
    dir: 'right',
    emoji: '❤️',
    className: 'right-4 top-1/2 -translate-y-1/2 border-green-500 text-green-700',
  },
  {
    dir: 'left',
    emoji: '🤷',
    className: 'left-4 top-1/2 -translate-y-1/2 border-red-500 text-red-700',
  },
  {
    dir: 'up',
    emoji: '👍',
    className: 'left-1/2 top-4 -translate-x-1/2 border-brand-500 text-brand-700',
  },
  {
    dir: 'down',
    emoji: '❓',
    className: 'bottom-4 left-1/2 -translate-x-1/2 border-neutral-400 text-neutral-600',
  },
]

function SwipeStamp({
  emoji,
  label,
  active,
  progress,
  className,
}: {
  emoji: string
  label: string
  active: boolean
  progress: number
  className: string
}) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-10 flex items-center gap-1 rounded-xl border-2 bg-white/85 px-3 py-1 text-sm font-bold uppercase tracking-wide ${className}`}
      style={{ opacity: active ? progress : 0 }}
    >
      <span className="text-lg">{emoji}</span>
      {label}
    </span>
  )
}

export function RateBeerCard({
  beer,
  onRate,
}: {
  beer: DeckBeer
  onRate: (rating: Rating, note?: string) => void
}) {
  const { t, i18n } = useTranslation()
  const [note, setNote] = useState('')
  const displayName =
    i18n.language.startsWith('he') && beer.name_hebrew ? beer.name_hebrew : beer.name

  function rate(rating: Rating) {
    onRate(rating, note.trim() || undefined)
  }

  // "I don't know this beer": records an `unknown` signal (no note) so the beer
  // drops out of future decks without nudging the taste profile. #219
  function skip() {
    onRate(RATINGS.unknown)
  }

  const { state, handlers } = useSwipeCard(rate)
  const transform = `translate(${state.dx}px, ${state.dy}px) rotate(${state.dx / 24}deg)`
  const stampLabels: Record<SwipeDirection, string> = {
    right: t('rate.tapper.loved', 'Loved it'),
    left: t('rate.tapper.disliked', 'Not for me'),
    up: t('rate.tapper.fine', 'It was fine'),
    down: t('rate.dontKnow', "I don't know this beer"),
  }

  return (
    <div className="relative">
      {STAMPS.map((s) => (
        <SwipeStamp
          key={s.dir}
          emoji={s.emoji}
          label={stampLabels[s.dir]}
          active={state.direction === s.dir}
          progress={state.progress}
          className={s.className}
        />
      ))}
      <div
        {...handlers}
        style={{ transform, touchAction: 'none' }}
        className={
          state.dragging ? '' : 'transition-transform duration-200 motion-reduce:transition-none'
        }
      >
        <Card className="border-neutral-200 bg-white p-6 text-center shadow-sm">
          <Heading level={2} className="text-xl">
            {displayName}
          </Heading>
          <p className="text-sm text-neutral-600">
            {beer.brewery} · {beer.style} · {beer.abv}%
          </p>
          <div className="mt-5">
            <RatingTapper
              onRate={rate}
              labels={{
                loved: t('rate.tapper.loved', 'Loved it'),
                fine: t('rate.tapper.fine', 'It was fine'),
                disliked: t('rate.tapper.disliked', 'Not for me'),
              }}
            />
          </div>
          <div className="mt-4 text-start">
            <label htmlFor="rate-note" className="text-xs font-medium text-neutral-600">
              {t('rate.notePrompt', 'Why? (optional)')}
            </label>
            <textarea
              id="rate-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              maxLength={NOTE_MAX}
              rows={2}
              className="mt-1 w-full rounded-lg border border-neutral-200 p-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder={t('rate.notePlaceholder', 'e.g. loved the citrus, too bitter for me…')}
            />
            <p className="mt-1 text-xs text-neutral-400">
              {t(
                'rate.sensitiveDataNote',
                'Free text may be analyzed to refine your taste. Avoid sensitive info.',
              )}
            </p>
          </div>
          <div className="mt-4 text-center">
            <Button variant="ghost" size="sm" onClick={skip}>
              {t('rate.dontKnow', "I don't know this beer")}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
