import { createRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Route as rootRoute } from './__root'
import { compareChallenge } from '../lib/api'
import type { ComparisonResult } from '../lib/api'
import { computeFlavorVector, getNextQuestion, type QuizAnswers } from '../lib/quiz'
import { FLAVOR_VECTOR_DIMENSIONS } from '@beerolog/types'
import { ComparisonCard } from '../components/ComparisonCard'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/challenge/$token',
  component: ChallengePage,
})

function ChallengePage() {
  const { token } = Route.useParams()

  const [step, setStep] = useState<'quiz' | 'loading' | 'result' | 'error'>('quiz')
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const currentQuestion = getNextQuestion(answers)

  async function handleAnswer(optionId: string) {
    const next = { ...answers, [currentQuestion!.id]: optionId }
    setAnswers(next)
    if (!getNextQuestion(next)) {
      setStep('loading')
      const vector = computeFlavorVector(next)
      const arr = FLAVOR_VECTOR_DIMENSIONS.map((d) => vector[d])
      try {
        const comparison = await compareChallenge(token, arr)
        setResult(comparison)
        setStep('result')
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
        setStep('error')
      }
    }
  }

  if (step === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-neutral-400 animate-pulse">Comparing taste profiles…</p>
      </main>
    )
  }

  if (step === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-2xl">😕</p>
        <p className="text-neutral-600 text-center">{error}</p>
      </main>
    )
  }

  if (step === 'result' && result) {
    function handleShare() {
      if (!result) return
      const pct = Math.round(result.similarity * 100)
      const text = `My friend and I are a ${pct}% taste match on Beerolog! I'm ${result.challenger_persona.icon} ${result.challenger_persona.name} and they're ${result.friend_persona.icon} ${result.friend_persona.name}. Challenge your friends at beerolog.app`
      if (navigator.share) void navigator.share({ text })
      else void navigator.clipboard.writeText(text)
    }

    return (
      <main className="flex min-h-screen flex-col items-center justify-start p-6 pt-10 bg-gradient-to-b from-amber-50 to-white">
        <div className="w-full max-w-sm flex flex-col gap-5">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-neutral-900">Your taste match</h1>
          </div>
          <ComparisonCard result={result} />
          <button
            onClick={handleShare}
            className="rounded-2xl bg-amber-600 py-3 text-sm font-semibold text-white hover:bg-amber-700"
          >
            📲 Share this comparison
          </button>
        </div>
      </main>
    )
  }

  if (!currentQuestion) return null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-white">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <p className="text-sm text-neutral-400">A friend challenged you — take the quiz to compare taste profiles</p>
          <h2 className="mt-3 text-xl font-bold text-neutral-900">{currentQuestion.question}</h2>
        </div>
        <div className="flex flex-col gap-3">
          {currentQuestion.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => void handleAnswer(opt.id)}
              className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-left text-base font-medium text-neutral-800 hover:border-amber-400 hover:bg-amber-50"
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
