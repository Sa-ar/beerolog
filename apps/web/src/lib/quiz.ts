import {
  type FlavorVector,
  type FlavorVectorDimension,
  FLAVOR_VECTOR_DIMENSIONS,
  NEUTRAL_FLAVOR_VECTOR,
  deserializeFlavorVector,
  serializeFlavorVector,
} from '@beerolog/types'

// ── Types ───────────────────────────────────────────────────────────────

export type QuizAnswers = Record<string, string>

export type QuizOption = {
  id: string
  label: string
  emoji: string
  vector: Partial<Record<FlavorVectorDimension, number>>
}

export type QuizQuestion = {
  id: string
  question: string
  options: QuizOption[]
  /** Return true to skip this question given prior answers. */
  shouldSkip: (answers: QuizAnswers) => boolean
}

// ── Quiz definition ───────────────────────────────────────────────────────

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'mood',
    question: 'What kind of drink do you want right now?',
    options: [
      { id: 'refreshing', label: 'Refreshing and easy', emoji: '🌊',
        vector: { bitterness: 0.15, body: 0.2, adventure: 0.2 } },
      { id: 'balanced', label: 'Balanced and smooth', emoji: '⚖️',
        vector: { bitterness: 0.3, body: 0.5, adventure: 0.4 } },
      { id: 'bold', label: 'Bold and flavorful', emoji: '🔥',
        vector: { bitterness: 0.65, body: 0.7, adventure: 0.65 } },
      { id: 'unsure', label: 'Not sure yet', emoji: '🤷',
        vector: {} },
    ],
    shouldSkip: () => false,
  },
  {
    id: 'flavor',
    question: 'What tastes sound best?',
    options: [
      { id: 'crisp', label: 'Crisp and clean', emoji: '✨',
        vector: { fruitiness: 0.1, roast: 0.0, sourness: 0.0, sweetness: 0.1 } },
      { id: 'fruity', label: 'Fruity or citrusy', emoji: '🍋',
        vector: { fruitiness: 0.8, sourness: 0.15, sweetness: 0.2 } },
      { id: 'sweet', label: 'Sweet or caramel-like', emoji: '🍯',
        vector: { sweetness: 0.75, roast: 0.2, fruitiness: 0.1 } },
      { id: 'roasty', label: 'Roasty or coffee-like', emoji: '☕',
        vector: { roast: 0.9, sweetness: 0.25, body: 0.75 } },
      { id: 'sour', label: 'Tart or sour', emoji: '🦊',
        vector: { sourness: 0.9, fruitiness: 0.55, bitterness: 0.05 } },
    ],
    shouldSkip: () => false,
  },
  {
    id: 'bitterness',
    question: 'How do you feel about bitterness?',
    options: [
      { id: 'none', label: 'The less bitter, the better', emoji: '😌',
        vector: { bitterness: 0.05 } },
      { id: 'little', label: 'A little bitterness is fine', emoji: '👌',
        vector: { bitterness: 0.3 } },
      { id: 'love_it', label: 'I like a noticeable bitter kick', emoji: '💪',
        vector: { bitterness: 0.85 } },
      { id: 'whatever', label: 'No opinion on bitterness', emoji: '🤷',
        vector: {} },
    ],
    // Sour answer already implies low bitterness
    shouldSkip: (a) => a['flavor'] === 'sour',
  },
  {
    id: 'body',
    question: 'How should it feel when you drink it?',
    options: [
      { id: 'light', label: 'Light and easy to drink', emoji: '💧',
        vector: { body: 0.15 } },
      { id: 'medium', label: 'Somewhere in the middle', emoji: '🎯',
        vector: { body: 0.5 } },
      { id: 'full', label: 'Rich and full-flavored', emoji: '🫙',
        vector: { body: 0.85 } },
      { id: 'no_pref', label: 'No preference', emoji: '🤷',
        vector: {} },
    ],
    // Body already implied by mood=refreshing (light) or flavor=roasty (full) or mood=bold
    shouldSkip: (a) =>
      a['mood'] === 'refreshing' || a['flavor'] === 'roasty' || a['mood'] === 'bold',
  },
  {
    id: 'adventure',
    question: 'How adventurous are you feeling?',
    options: [
      { id: 'safe', label: 'Keep it safe — I know what I like', emoji: '🏡',
        vector: { adventure: 0.15 } },
      { id: 'curious', label: 'Something a little different', emoji: '🗺️',
        vector: { adventure: 0.5 } },
      { id: 'wild', label: 'Surprise me — go for it', emoji: '🎲',
        vector: { adventure: 0.9 } },
    ],
    shouldSkip: () => false,
  },
  {
    id: 'situation',
    question: 'What are you drinking for?',
    options: [
      { id: 'hanging_out', label: 'Just hanging out', emoji: '🛋️',
        vector: {} },
      { id: 'food', label: 'Going with food', emoji: '🍕',
        vector: { body: 0.55 } },
      { id: 'hot_day', label: 'Hot day — need something refreshing', emoji: '☀️',
        vector: { body: 0.15, sourness: 0.15 } },
      { id: 'celebrating', label: 'Celebrating something', emoji: '🥂',
        vector: { adventure: 0.6 } },
    ],
    shouldSkip: () => false,
  },
]

// ── State machine ─────────────────────────────────────────────────────────

/** Returns the next unanswered, non-skipped question, or null if complete. */
export function getNextQuestion(answers: QuizAnswers): QuizQuestion | null {
  for (const q of QUIZ_QUESTIONS) {
    if (!q.shouldSkip(answers) && !(q.id in answers)) return q
  }
  return null
}

export function getActiveQuestions(answers: QuizAnswers): QuizQuestion[] {
  return QUIZ_QUESTIONS.filter((q) => !q.shouldSkip(answers))
}

// ── Vector computation ────────────────────────────────────────────────────

/**
 * Converts quiz answers into a FlavorVector.
 * Each answer contributes dimension values; final = average of contributions per dim.
 * Uncovered dimensions default to 0.5 (neutral).
 */
export function computeFlavorVector(answers: QuizAnswers): FlavorVector {
  const contributions: Partial<Record<FlavorVectorDimension, number[]>> = {}

  for (const [questionId, optionId] of Object.entries(answers)) {
    const question = QUIZ_QUESTIONS.find((q) => q.id === questionId)
    const option = question?.options.find((o) => o.id === optionId)
    if (!option) continue

    for (const [dim, value] of Object.entries(option.vector) as [FlavorVectorDimension, number][]) {
      if (!contributions[dim]) contributions[dim] = []
      contributions[dim]!.push(value)
    }
  }

  const result: Record<string, number> = {}
  for (const dim of FLAVOR_VECTOR_DIMENSIONS) {
    const vals = contributions[dim] ?? []
    result[dim] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0.5
  }

  return result as FlavorVector
}

// ── URL encoding ────────────────────────────────────────────────────────────

export function encodeVector(v: FlavorVector): string {
  const bytes = new Float32Array(serializeFlavorVector(v)).buffer
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
}

export function decodeVector(s: string): FlavorVector {
  try {
    const bytes = Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
    return deserializeFlavorVector(Array.from(new Float32Array(bytes.buffer)))
  } catch {
    return NEUTRAL_FLAVOR_VECTOR
  }
}
