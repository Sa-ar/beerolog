// Adaptive onboarding quiz as a pure question graph. The stepper renders one
// question at a time; branches fire only on extreme answers, so the always-shown
// core stays small while high-signal cases get a follow-up. No I/O, no React —
// fully unit-testable.

export type Answers = {
  coffee?: 'black' | 'milk_based' | 'sweet' | 'none'
  chocolate?: 'dark_90' | 'dark_70' | 'milk' | 'none'
  water?: 'still' | 'light' | 'strong'
  sweet_tooth?: 'rich' | 'balanced' | 'dry'
  strength?: 'light' | 'medium' | 'strong'
  sour_foods?: 'love' | 'okay' | 'avoid'
  sour_wild?: 'bright' | 'funky'
  smoked_foods?: 'love' | 'okay' | 'avoid'
  adventure?: 'low' | 'medium' | 'high'
  avoids?: string[]
  flavor_cues?: string[]
}

export type QuestionType = 'single' | 'multi'

export type QuestionDef = {
  id: string
  field: keyof Answers
  type: QuestionType
  // i18n: question prompt at onboarding.questions.<id>, options at enums.<group>.<option>
  group: string
  options: string[]
  optional?: boolean
  // Branch predicate — when omitted the question is always asked.
  shouldAsk?: (a: Answers) => boolean
}

export const QUESTIONS: QuestionDef[] = [
  { id: 'coffee', field: 'coffee', type: 'single', group: 'coffee',
    options: ['black', 'milk_based', 'sweet', 'none'] },
  // Conditional bitterness confirm — only when coffee is ambiguous.
  { id: 'chocolate', field: 'chocolate', type: 'single', group: 'choco',
    options: ['dark_90', 'dark_70', 'milk', 'none'],
    shouldAsk: (a) => a.coffee === 'milk_based' || a.coffee === 'none' },
  { id: 'water', field: 'water', type: 'single', group: 'fizz',
    options: ['strong', 'light', 'still'] },
  { id: 'sweet_tooth', field: 'sweet_tooth', type: 'single', group: 'sweet',
    options: ['rich', 'balanced', 'dry'] },
  { id: 'strength', field: 'strength', type: 'single', group: 'strength',
    options: ['light', 'medium', 'strong'] },
  { id: 'sour_foods', field: 'sour_foods', type: 'single', group: 'love',
    options: ['love', 'okay', 'avoid'] },
  // Conditional refinement — only when they love sour.
  { id: 'sour_wild', field: 'sour_wild', type: 'single', group: 'sour_wild',
    options: ['bright', 'funky'], shouldAsk: (a) => a.sour_foods === 'love' },
  { id: 'smoked_foods', field: 'smoked_foods', type: 'single', group: 'love',
    options: ['love', 'okay', 'avoid'] },
  { id: 'adventure', field: 'adventure', type: 'single', group: 'adventure',
    options: ['high', 'medium', 'low'] },
  // CATA — fires only on an extreme avoid; optional (skippable).
  { id: 'avoids', field: 'avoids', type: 'multi', group: 'avoid', optional: true,
    options: ['too_bitter', 'too_sweet', 'too_heavy', 'too_dark'],
    shouldAsk: (a) => a.sour_foods === 'avoid' || a.smoked_foods === 'avoid' },
  // Optional capstone flavor-cue grid.
  { id: 'flavor_cues', field: 'flavor_cues', type: 'multi', group: 'cue', optional: true,
    options: ['grapefruit', 'caramel', 'pine', 'tropical', 'banana_bread',
      'citrus_zest', 'bread_crust'] },
]

const isAsked = (q: QuestionDef, a: Answers) => (q.shouldAsk ? q.shouldAsk(a) : true)
const isAnswered = (q: QuestionDef, a: Answers) =>
  Object.prototype.hasOwnProperty.call(a, q.field)

// The next question to show, or null when the quiz is complete.
export function nextQuestion(a: Answers): QuestionDef | null {
  return QUESTIONS.find((q) => isAsked(q, a) && !isAnswered(q, a)) ?? null
}

export function isComplete(a: Answers): boolean {
  return nextQuestion(a) === null
}

// 1-based position / total for the *current* path, for a progress indicator.
export function progress(a: Answers): { step: number; total: number } {
  const path = QUESTIONS.filter((q) => isAsked(q, a))
  const answered = path.filter((q) => isAnswered(q, a)).length
  return { step: Math.min(answered + 1, path.length), total: path.length }
}

// Drop answers whose branch is no longer active (e.g. coffee changed away from
// 'milk_based' after chocolate was answered) before submitting.
export function prunedAnswers(a: Answers): Answers {
  const out: Answers = {}
  for (const q of QUESTIONS) {
    if (isAsked(q, a) && isAnswered(q, a)) {
      // @ts-expect-error indexed assignment across the union is safe here
      out[q.field] = a[q.field]
    }
  }
  return out
}
