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
}

export function RatingTapper({ onRate, disabled }: RatingTapperProps) {
  return (
    <div className="flex gap-3">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onRate(opt.value)}
          disabled={disabled}
          className={cn(
            'flex flex-1 flex-col items-center gap-1 rounded-xl border border-neutral-200 py-4 text-sm font-medium transition-colors',
            'hover:border-brand-500 hover:bg-brand-50 disabled:opacity-50',
          )}
        >
          <span className="text-2xl">{opt.emoji}</span>
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  )
}
