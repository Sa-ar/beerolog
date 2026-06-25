/**
 * Presentation-only adaptive quiz stepper. Two phases:
 *
 *  - First pass (incomplete): linear forward. Answering a single-choice
 *    question for the FIRST time auto-advances; multi-choice uses Continue
 *    (+ Skip if optional). Back revisits earlier answers (explicit, prefilled).
 *    You cannot skip ahead, and there is no Summary yet.
 *  - Edit mode (complete): the Summary is the hub. Editing any answer opens
 *    that question with Back / Next / Done and never auto-advances; Done (or
 *    Next past the end) returns to the Summary. Editing keeps every still-valid
 *    answer, drops only the ones a changed answer orphaned, and routes forward
 *    only when the change unlocks a brand-new question.
 *
 * Unifying rule: a question auto-advances exactly once — the first time it is
 * answered. Every later visit is explicit. No I/O beyond optional localStorage
 * persistence (storageKey).
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card, CardContent } from '@beerolog/ui'
import { ChalkTick, QuizChips, optionCardClass, optionGrid } from './QuizChips'
import { QuizIcon } from './quiz-icons'
import {
  type Answers,
  type QuestionDef,
  QUESTIONS,
  nextQuestion,
  progress,
  prunedAnswers,
} from '../lib/onboarding-quiz'

type Value = Answers[keyof Answers]

const QUESTION_BY_FIELD = new Map<keyof Answers, QuestionDef>(
  QUESTIONS.map((q) => [q.field, q]),
)
const isAsked = (q: QuestionDef, a: Answers) => !q.shouldAsk || q.shouldAsk(a)
const hasField = (a: Answers, q: QuestionDef) =>
  Object.prototype.hasOwnProperty.call(a, q.field)
// The ordered list of questions the current answers ask (frontier + past).
const askedSeq = (a: Answers) => QUESTIONS.filter((q) => isAsked(q, a))

// Set one answer, then drop answers the new state no longer asks (orphans from
// an adaptive change). Delegates to the shared prunedAnswers so the orphaning
// rule has a single source of truth.
function applyAndPrune(a: Answers, field: keyof Answers, value: Value): Answers {
  return prunedAnswers({ ...a, [field]: value })
}

// Keep only known fields whose stored value is still a valid option. Guards the
// persisted payload: an array / non-object, or a value from an older deploy
// that no longer exists in q.options, can't surface raw enum keys in the
// Summary or strand the edit view with a no-selection radio group.
function sanitizeAnswers(raw: unknown): Answers {
  const clean: Record<string, unknown> = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return clean as Answers
  for (const q of QUESTIONS) {
    const v = (raw as Record<string, unknown>)[q.field as string]
    if (v === undefined) continue
    if (q.type === 'multi') {
      if (Array.isArray(v) && v.every((x) => q.options.includes(x as string))) clean[q.field] = v
    } else if (typeof v === 'string' && q.options.includes(v)) {
      clean[q.field] = v
    }
  }
  return prunedAnswers(clean as Answers)
}

export function QuizStepper({
  onComplete,
  completing = false,
  storageKey,
  children,
}: {
  // Fired once when the quiz finishes. Receives the raw (un-pruned) answers.
  onComplete: (answers: Answers) => void
  // When true the complete CTA shows a busy state and is disabled.
  completing?: boolean
  // localStorage key for persisting in-progress answers. Omit to disable.
  storageKey?: string | undefined
  // Optional extra content rendered on the Summary (e.g. an error).
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  const [a, setA] = useState<Answers>({})
  // The question being revisited/edited; null = "auto" (the frontier during the
  // first pass, or the Summary once everything is answered).
  const [cursor, setCursor] = useState<keyof Answers | null>(null)
  const [loaded, setLoaded] = useState(false)

  // Persist answers so a refresh or return resumes where you left off.
  useEffect(() => {
    if (!storageKey) {
      setLoaded(true)
      return
    }
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) setA(sanitizeAnswers(JSON.parse(raw)))
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true)
  }, [storageKey])

  useEffect(() => {
    if (!storageKey || !loaded) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(a))
    } catch {
      // ignore quota / privacy-mode errors
    }
  }, [storageKey, loaded, a])

  const frontier = nextQuestion(a)
  const complete = frontier === null
  const seq = askedSeq(a)

  const cursorQ = cursor ? (QUESTION_BY_FIELD.get(cursor) ?? null) : null
  // Only a still-asked, answered question counts as a revisit; a cursor left
  // dangling by an orphaning edit falls back to auto.
  const revisiting = cursorQ != null && hasField(a, cursorQ) && isAsked(cursorQ, a)
  const currentQ = revisiting ? cursorQ : frontier

  const { step, total } = progress(a)
  const seqIndex = (field: keyof Answers) => seq.findIndex((q) => q.field === field)
  const hasPrev = (field: keyof Answers) => seqIndex(field) > 0

  function submit() {
    // The persisted draft is cleared by the caller on a *successful* save, not
    // here — clearing on submit would lose answers if the save then fails and
    // the user reloads.
    onComplete(a)
  }

  // First answer of a frontier question — advance to the next frontier.
  function frontierCommit(field: keyof Answers, value: Value) {
    setA((prev) => applyAndPrune(prev, field, value))
    setCursor(null)
  }

  // Back from the frontier revisits the previous answered question.
  function frontierBack() {
    const fIdx = frontier ? seqIndex(frontier.field) : seq.length
    const prev = seq[fIdx - 1]
    if (prev) setCursor(prev.field)
  }

  // Commit a revisited/edited answer (possibly unchanged) and move per `dir`.
  function navCommit(field: keyof Answers, value: Value, dir: 'back' | 'next' | 'done') {
    const next = applyAndPrune(a, field, value)
    setA(next)
    if (dir === 'done') {
      setCursor(null)
      return
    }
    const s = askedSeq(next)
    const idx = s.findIndex((q) => q.field === field)
    if (dir === 'back') {
      const prev = s[idx - 1]
      setCursor(prev ? prev.field : null)
    } else {
      const nf = s[idx + 1]
      // Step to the next answered question; otherwise hand off to auto (the
      // frontier if still incomplete, the Summary if done).
      setCursor(nf && hasField(next, nf) ? nf.field : null)
    }
  }

  return (
    <Card className="border-brand-700/40">
      <CardContent className="space-y-6 pt-6">
        {currentQ === null ? (
          <Summary
            a={a}
            seq={seq}
            completing={completing}
            onEdit={setCursor}
            onSubmit={submit}
          >
            {children}
          </Summary>
        ) : (
          <>
            {complete ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-300">
                {t('onboarding.reviewHeadline')}
              </p>
            ) : (
              <div className="space-y-1.5">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-brand-300 transition-all"
                    style={{ width: `${total ? (step / total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs font-medium text-neutral-500" aria-live="polite">
                  {t('onboarding.progress', { step, total })}
                  {storageKey ? (
                    <span className="text-neutral-400"> · {t('onboarding.savedHint')}</span>
                  ) : null}
                </p>
                {step >= total ? (
                  <p className="text-xs font-medium text-brand-300">
                    {t('onboarding.almostThere')}
                  </p>
                ) : null}
              </div>
            )}

            <QuestionView
              key={currentQ.id}
              q={currentQ}
              revisit={revisiting}
              complete={complete}
              hasPrev={hasPrev(currentQ.field)}
              initial={a[currentQ.field] ?? (currentQ.type === 'multi' ? [] : null)}
              onFrontierCommit={(v) => frontierCommit(currentQ.field, v)}
              onBack={(v) =>
                revisiting ? navCommit(currentQ.field, v, 'back') : frontierBack()
              }
              onNext={(v) => navCommit(currentQ.field, v, 'next')}
              onDone={(v) => navCommit(currentQ.field, v, 'done')}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}

type QuestionViewProps = {
  q: QuestionDef
  revisit: boolean
  complete: boolean
  hasPrev: boolean
  initial: Value | null
  onFrontierCommit: (value: Value) => void
  onBack: (value: Value) => void
  onNext: (value: Value) => void
  onDone: (value: Value) => void
}

function QuestionView(props: QuestionViewProps) {
  return props.q.type === 'multi' ? (
    <MultiView {...props} initial={(props.initial as string[] | null) ?? []} />
  ) : (
    <SingleView {...props} initial={(props.initial as string | null) ?? null} />
  )
}

// Back / Next / Done row shown when revisiting or editing a question.
function NavRow({
  hasPrev,
  complete,
  value,
  onBack,
  onNext,
  onDone,
}: {
  hasPrev: boolean
  complete: boolean
  value: Value
  onBack: (value: Value) => void
  onNext: (value: Value) => void
  onDone: (value: Value) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-3">
      {hasPrev ? (
        <Button variant="outline" size="md" data-testid="quiz-back" onClick={() => onBack(value)}>
          {t('onboarding.back')}
        </Button>
      ) : null}
      <Button variant="outline" size="md" data-testid="quiz-next" onClick={() => onNext(value)}>
        {t('onboarding.next')}
      </Button>
      {complete ? (
        <Button size="md" data-testid="quiz-done" onClick={() => onDone(value)}>
          {t('onboarding.done')}
        </Button>
      ) : null}
    </div>
  )
}

function SingleView({
  q,
  revisit,
  complete,
  hasPrev,
  initial,
  onFrontierCommit,
  onBack,
  onNext,
  onDone,
}: Omit<QuestionViewProps, 'initial'> & { initial: string | null }) {
  const { t } = useTranslation()
  const [pending, setPending] = useState<string | null>(initial)
  return (
    <div className="space-y-5 animate-[fadeIn_200ms_ease-out]">
      <QuizChips<string>
        title={t(`onboarding.questions.${q.id}`)}
        group={q.group}
        options={q.options}
        value={pending}
        onChange={setPending}
        // First pass: a pointer tap auto-advances; keyboard selection only sets
        // the value and surfaces an explicit Next. Revisits never auto-advance.
        onPointerPick={revisit ? undefined : (v) => onFrontierCommit(v as Value)}
      />
      {revisit ? (
        <NavRow
          hasPrev={hasPrev}
          complete={complete}
          value={(pending ?? initial ?? '') as Value}
          onBack={onBack}
          onNext={onNext}
          onDone={onDone}
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          {hasPrev ? (
            <Button
              variant="outline"
              size="md"
              data-testid="quiz-back"
              onClick={() => onBack('' as Value)}
            >
              {t('onboarding.back')}
            </Button>
          ) : null}
          {pending != null ? (
            <Button
              size="md"
              data-testid="quiz-next"
              onClick={() => onFrontierCommit(pending as Value)}
            >
              {t('onboarding.next')}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function MultiView({
  q,
  revisit,
  complete,
  hasPrev,
  initial,
  onFrontierCommit,
  onBack,
  onNext,
  onDone,
}: Omit<QuestionViewProps, 'initial'> & { initial: string[] }) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string[]>(initial)
  const toggle = (o: string) =>
    setSelected((s) => (s.includes(o) ? s.filter((x) => x !== o) : [...s, o]))
  return (
    <div
      role="group"
      data-testid={`question-${q.id}`}
      aria-label={t(`onboarding.questions.${q.id}`)}
      className="space-y-5 animate-[fadeIn_200ms_ease-out]"
    >
      <p className="font-display text-xl font-semibold uppercase tracking-wide text-neutral-900">
        {t(`onboarding.questions.${q.id}`)}
        {q.optional ? (
          <span className="ms-2 text-sm font-normal normal-case tracking-normal text-neutral-500">
            {t('onboarding.optional')}
          </span>
        ) : null}
      </p>
      <div className={`grid gap-3 ${optionGrid(q.options.length)}`}>
        {q.options.map((option) => {
          const on = selected.includes(option)
          return (
            <label key={option} className={optionCardClass(on)}>
              <input
                type="checkbox"
                data-value={option}
                checked={on}
                onChange={() => toggle(option)}
                className="sr-only"
              />
              <span className="flex flex-col items-center gap-1.5">
                <QuizIcon group={q.group} option={option} className="h-6 w-6" />
                <span>{t(`enums.${q.group}.${option}`)}</span>
              </span>
              {on ? <ChalkTick /> : null}
            </label>
          )
        })}
      </div>
      {revisit ? (
        <NavRow
          hasPrev={hasPrev}
          complete={complete}
          value={selected as Value}
          onBack={onBack}
          onNext={onNext}
          onDone={onDone}
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          {hasPrev ? (
            <Button
              variant="outline"
              size="md"
              data-testid="quiz-back"
              onClick={() => onBack(selected as Value)}
            >
              {t('onboarding.back')}
            </Button>
          ) : null}
          <Button
            size="md"
            data-testid="quiz-continue"
            onClick={() => onFrontierCommit(selected as Value)}
          >
            {t('onboarding.continue')}
          </Button>
          {q.optional ? (
            <Button
              variant="outline"
              size="md"
              data-testid="quiz-skip"
              onClick={() => onFrontierCommit([] as Value)}
            >
              {t('onboarding.skip')}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Summary({
  a,
  seq,
  completing,
  onEdit,
  onSubmit,
  children,
}: {
  a: Answers
  seq: QuestionDef[]
  completing: boolean
  onEdit: (field: keyof Answers) => void
  onSubmit: () => void
  children?: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold uppercase tracking-wide text-neutral-900">
          {t('onboarding.reviewHeadline')}
        </h2>
        <p className="text-sm text-neutral-500">{t('onboarding.readyHeadline')}</p>
      </div>
      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200">
        {seq
          .filter((q) => hasField(a, q))
          .map((q) => {
            const val = a[q.field]
            const labels = (Array.isArray(val) ? val : [val])
              .map((v) => t(`enums.${q.group}.${v}`))
              .join(', ')
            return (
              <li
                key={String(q.field)}
                className="flex items-start justify-between gap-3 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs text-neutral-500">
                    {t(`onboarding.questions.${q.id}`)}
                  </p>
                  <p className="text-sm font-medium text-neutral-900">
                    {labels || t('onboarding.skip')}
                  </p>
                </div>
                <button
                  type="button"
                  data-testid={`quiz-edit-${q.id}`}
                  onClick={() => onEdit(q.field)}
                  className="shrink-0 rounded text-sm font-medium text-brand-300 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
                >
                  {t('onboarding.edit')}
                </button>
              </li>
            )
          })}
      </ul>
      {children}
      <Button size="lg" data-testid="quiz-submit" disabled={completing} onClick={onSubmit}>
        {completing ? t('onboarding.saving') : t('onboarding.save')}
      </Button>
      <p className="text-center text-xs text-neutral-500">{t('onboarding.submitHint')}</p>
    </div>
  )
}
