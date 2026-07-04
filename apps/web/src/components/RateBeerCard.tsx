/**
 * One beer in the /rate deck: name, meta, the loved/fine/disliked tapper, and
 * an optional free-text note. Owns its own note state — parent passes
 * `key={beer.id}` so it resets between beers.
 */
import type { Rating } from '@beerolog/types'
import { Card, RatingTapper } from '@beerolog/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { DeckBeer } from '../lib/rate-deck'

const NOTE_MAX = 500

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

  return (
    <Card className="border-neutral-200 bg-white p-6 text-center shadow-sm">
      <h2 className="text-xl font-bold text-neutral-900">{displayName}</h2>
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
          {t('rate.sensitiveDataNote', 'Free text may be analyzed to refine your taste. Avoid sensitive info.')}
        </p>
      </div>
    </Card>
  )
}
