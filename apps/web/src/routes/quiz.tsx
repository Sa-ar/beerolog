import { createRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Route as rootRoute } from './__root'
import {
  getNextQuestion,
  getActiveQuestions,
  computeFlavorVector,
  encodeVector,
  type QuizAnswers,
} from '../lib/quiz'
import { getUser } from '../lib/auth'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/quiz',
  component: QuizPage,
})

function QuizPage() {
  const navigate = useNavigate()
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const user = getUser()

  useEffect(() => {
    if (!user) {
      void navigate({ to: '/signin', search: { next: '/quiz' } })
    }
  }, [navigate, user])

  const currentQuestion = getNextQuestion(answers)
  const activeQuestions = getActiveQuestions(answers)
  const answeredCount = Object.keys(answers).length
  const totalCount = activeQuestions.length
  const progress = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-white">
        <p className="text-sm text-neutral-400 animate-pulse">Redirecting to sign in…</p>
      </main>
    )
  }

  function handleAnswer(optionId: string) {
    if (!currentQuestion) return
    const newAnswers = { ...answers, [currentQuestion.id]: optionId }
    const next = getNextQuestion(newAnswers)

    if (!next) {
      const vector = computeFlavorVector(newAnswers)
      void navigate({ to: '/results', search: { v: encodeVector(vector) } })
    } else {
      setAnswers(newAnswers)
    }
  }

  if (!currentQuestion) return null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-white">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Progress */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-xs text-neutral-400">
            <span>Question {answeredCount + 1} of ~{totalCount}</span>
            <span>🍺 Beerolog</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-neutral-200">
            <div
              className="h-1.5 rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <h2 className="text-2xl font-bold text-neutral-900 leading-snug">
          {currentQuestion.question}
        </h2>

        {/* Options */}
        <div className="flex flex-col gap-3">
          {currentQuestion.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => handleAnswer(opt.id)}
              className="flex items-center gap-4 rounded-xl border-2 border-neutral-200 bg-white p-4 text-left text-base font-medium text-neutral-800 transition-all hover:border-amber-400 hover:bg-amber-50 active:scale-[0.98]"
            >
              <span className="text-2xl">{opt.emoji}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>

      </div>
    </main>
  )
}
