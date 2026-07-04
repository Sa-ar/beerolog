import * as React from 'react'
import type { Rating } from '@beerolog/types'
import { cn } from '../lib/utils'

const OPTIONS: { value: Rating; label: string; emoji: string }[] = [
  { value: 'loved', label: 'Loved it', emoji: '❤️' },
  { value: 'fine', label: 'It was fine', emoji: '👍' },
  { value: 'disliked', label: 'Not for me', emoji: '🤷' },
]

interface RatingTapperProps {
  onRate: (rating: Rating) => void
  disabled?: boolean
  /** Localized labels keyed by rating; falls back to the built-in English. */
  labels?: Partial<Record<Rating, string>>
}

export function RatingTapper({ onRate, disabled, labels }: RatingTapperProps) {
  return (
    <div className="flex gap-3">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onRate(opt.value)}
          disabled={disabled}
          className={cn(
            'flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-xl border border-neutral-200 py-4 text-sm font-medium transition-colors',
            'hover:border-brand-500 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          <span className="text-2xl">{opt.emoji}</span>
          <span>{labels?.[opt.value] ?? opt.label}</span>
        </button>
      ))}
    </div>
  )
}
