import { useUser } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { rateBeer } from '../lib/api'

type Props = {
  beer: { id: string; name: string; style: string; flavor_vector: number[] }
  onDismiss: () => void
}

const RATINGS = [
  { value: 'loved', emoji: '😍', label: 'Loved it' },
  { value: 'fine', emoji: '👍', label: 'It was fine' },
  { value: 'disliked', emoji: '🙅', label: 'Not for me' },
] as const

export function RatingPrompt({ beer, onDismiss }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const { isSignedIn } = useUser()

  async function handleRate(rating: 'loved' | 'fine' | 'disliked') {
    if (isSignedIn) {
      await rateBeer(beer, rating)
    }
    setSubmitted(true)
    setTimeout(onDismiss, 1200)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-6">
      <div className="w-full max-w-sm rounded-2xl bg-white border border-neutral-200 shadow-xl p-5">
        {submitted ? (
          <p className="text-center text-sm font-medium text-neutral-700">Thanks! Your profile is updating 🍻</p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-neutral-800">How was the {beer.name}?</p>
              <button onClick={onDismiss} className="text-neutral-400 hover:text-neutral-600 text-lg leading-none">×</button>
            </div>
            <div className="flex gap-2">
              {RATINGS.map(({ value, emoji, label }) => (
                <button
                  key={value}
                  onClick={() => void handleRate(value)}
                  className="flex-1 flex flex-col items-center gap-1 rounded-xl border border-neutral-200 py-3 hover:border-amber-400 hover:bg-amber-50"
                >
                  <span className="text-2xl">{emoji}</span>
                  <span className="text-xs font-medium text-neutral-600">{label}</span>
                </button>
              ))}
            </div>
            {!isSignedIn && (
              <p className="mt-3 text-center text-xs text-neutral-400">
                <Link to="/signin" search={{ next: '/results' }} className="underline">
                  Sign in
                </Link>{' '}
                to save your rating and improve your profile.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
