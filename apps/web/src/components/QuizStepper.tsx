/**
 * Presentation-only adaptive quiz stepper. Walks the pure question graph
 * (lib/onboarding-quiz) one question at a time, exposes back/progress UI, and
 * fires onComplete(answers) once every active question is answered. No I/O —
 * the parent decides what to do with the answers (POST /onboarding, guest
 * preview, etc.).
 */

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, CardContent } from '@beerolog/ui'
import { QuizChips } from './QuizChips'
import {
  type Answers,
  type QuestionDef,
  nextQuestion,
  progress,
} from '../lib/onboarding-quiz'

export function QuizStepper({
  onComplete,
  completing = false,
  children,
}: {
  // Fired once when the quiz finishes. Receives the raw (un-pruned) answers;
  // the caller prunes/persists as it sees fit.
  onComplete: (answers: Answers) => void
  // When true the complete CTA shows a busy state and is disabled.
  completing?: boolean
  // Optional extra content rendered on the completion screen (e.g. an error).
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  const [a, setA] = useState<Answers>({})
  const [history, setHistory] = useState<(keyof Answers)[]>([])

  const current = nextQuestion(a)
  const { step, total } = progress(a)

  function commit(field: keyof Answers, value: Answers[keyof Answers]) {
    setA((prev) => ({ ...prev, [field]: value }))
    setHistory((h) => [...h, field])
  }

  function back() {
    const last = history[history.length - 1]
    if (!last) return
    setA((prev) => {
      const next = { ...prev }
      delete next[last]
      return next
    })
    setHistory((h) => h.slice(0, -1))
  }

  return (
    <Card>
      <CardContent className="space-y-6 pt-6">
        <p className="text-xs font-medium text-neutral-500" aria-live="polite">
          {t('onboarding.progress', { step, total })}
        </p>

        {current === null ? (
          <div className="space-y-4">
            <p className="text-lg font-medium text-neutral-900">
              {t('onboarding.readyHeadline')}
            </p>
            {children}
            <Button
              size="lg"
              data-testid="quiz-submit"
              disabled={completing}
              onClick={() => onComplete(a)}
            >
              {completing ? t('onboarding.saving') : t('onboarding.save')}
            </Button>
          </div>
        ) : current.type === 'multi' ? (
          <MultiQuestion key={current.id} q={current} onCommit={commit} />
        ) : (
          <SingleQuestion key={current.id} q={current} onCommit={commit} />
        )}

        {history.length > 0 ? (
          <button
            type="button"
            data-testid="quiz-back"
            onClick={back}
            className="text-sm font-medium text-neutral-500 underline-offset-2 hover:underline"
          >
            {t('onboarding.back')}
          </button>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SingleQuestion({
  q,
  onCommit,
}: {
  q: QuestionDef
  onCommit: (field: keyof Answers, value: Answers[keyof Answers]) => void
}) {
  const { t } = useTranslation()
  return (
    <QuizChips
      title={t(`onboarding.questions.${q.id}`)}
      group={q.group}
      options={q.options}
      value={null}
      onChange={(v) => onCommit(q.field, v as Answers[keyof Answers])}
    />
  )
}

function MultiQuestion({
  q,
  onCommit,
}: {
  q: QuestionDef
  onCommit: (field: keyof Answers, value: Answers[keyof Answers]) => void
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>([])

  function toggle(option: string) {
    setSelected((s) => (s.includes(option) ? s.filter((o) => o !== option) : [...s, option]))
  }

  return (
    <div
      role="group"
      data-testid={`question-${q.id}`}
      aria-label={t(`onboarding.questions.${q.id}`)}
      className="space-y-3"
    >
      <p className="font-medium text-neutral-900">{t(`onboarding.questions.${q.id}`)}</p>
      <div className="flex flex-wrap gap-2">
        {q.options.map((option) => {
          const on = selected.includes(option)
          return (
            <button
              key={option}
              type="button"
              data-value={option}
              aria-pressed={on}
              onClick={() => toggle(option)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? 'border-amber-700 bg-amber-700 text-white'
                  : 'border-amber-200 bg-white text-amber-800 hover:bg-amber-50'
              }`}
            >
              {t(`enums.${q.group}.${option}`)}
            </button>
          )
        })}
      </div>
      <div className="flex gap-3">
        <Button size="md" data-testid="quiz-continue" onClick={() => onCommit(q.field, selected)}>
          {t('onboarding.continue')}
        </Button>
        {q.optional ? (
          <Button
            size="md"
            variant="outline"
            data-testid="quiz-skip"
            onClick={() => onCommit(q.field, [])}
          >
            {t('onboarding.skip')}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
