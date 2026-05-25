import { createRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { Route as rootRoute } from './__root'
import { joinSession, submitVector } from '../lib/api'
import { computeFlavorVector, encodeVector, getNextQuestion, type QuizAnswers } from '../lib/quiz'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/group/$sessionId',
  component: GroupJoinPage,
})

function GroupJoinPage() {
  const { sessionId } = Route.useParams()
  const navigate = useNavigate()

  const [step, setStep] = useState<'join' | 'quiz' | 'done' | 'error'>('join')
  const [name, setName] = useState('')
  const [participantId, setParticipantId] = useState<string | null>(null)
  const [answers, setAnswers] = useState<QuizAnswers>({})
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const currentQuestion = getNextQuestion(answers)

  async function handleJoin() {
    if (!name.trim()) return
    try {
      const { participant_id } = await joinSession(sessionId, name.trim())
      setParticipantId(participant_id)
      setStep('quiz')
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to join session')
      setStep('error')
    }
  }

  async function handleAnswer(optionId: string) {
    const next = { ...answers, [currentQuestion!.id]: optionId }
    setAnswers(next)
    if (!getNextQuestion(next)) {
      // Quiz complete
      const vector = computeFlavorVector(next)
      const arr = [vector.bitterness, vector.sweetness, vector.fruitiness, vector.roast, vector.sourness, vector.body, vector.adventure]
      await submitVector(sessionId, participantId!, arr)
      setStep('done')
    }
  }

  if (step === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <p className="text-2xl">😕</p>
        <p className="text-neutral-600 text-center">{errorMsg}</p>
      </main>
    )
  }

  if (step === 'done') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 bg-gradient-to-b from-amber-50 to-white">
        <p className="text-5xl">🍻</p>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">You're in!</h1>
          <p className="mt-2 text-neutral-500">Your taste has been submitted. Wait for the host to reveal the group pick.</p>
        </div>
      </main>
    )
  }

  if (step === 'join') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-white">
        <div className="w-full max-w-sm flex flex-col gap-5">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-neutral-900">Join the group</h1>
            <p className="mt-1 text-neutral-500">Enter your name to take the quiz</p>
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleJoin() }}
            placeholder="Your name"
            className="rounded-xl border border-neutral-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={() => void handleJoin()}
            disabled={!name.trim()}
            className="rounded-2xl bg-amber-600 py-4 text-base font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            Let's go →
          </button>
        </div>
      </main>
    )
  }

  // step === 'quiz'
  if (!currentQuestion) return null

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-white">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <p className="text-sm text-neutral-400 text-center">Hi {name} — let's find your beer</p>
        <h2 className="text-xl font-bold text-neutral-900 text-center">{currentQuestion.question}</h2>
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
