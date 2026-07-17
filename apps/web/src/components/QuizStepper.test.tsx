import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest'
import en from '../i18n/locales/en/common.json'
import { QuizStepper } from './QuizStepper'
import { prunedAnswers, type Answers } from '../lib/onboarding-quiz'

const i18n = i18next.createInstance()

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    resources: { en: { common: en } },
  })
})

function renderStepper(onComplete: (a: Answers) => void, storageKey?: string) {
  return render(
    <I18nextProvider i18n={i18n}>
      <QuizStepper onComplete={onComplete} storageKey={storageKey} />
    </I18nextProvider>,
  )
}

beforeEach(() => localStorage.clear())

// Walk the current path to the Summary by taking the first option of each
// single question, and Continue/Skip for multi questions.
async function walkToSummary(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 30; i++) {
    if (screen.queryByTestId('quiz-submit')) return
    const radio = document.querySelector('[role=radiogroup] input[type="radio"]') as HTMLElement | null
    const skip = screen.queryByTestId('quiz-skip')
    const cont = screen.queryByTestId('quiz-continue')
    if (radio) await user.click(radio)
    else if (skip) await user.click(skip)
    else if (cont) await user.click(cont)
    else break
  }
}

// Click the radio/option element by its data-value within the current question.
async function clickValue(user: ReturnType<typeof userEvent.setup>, value: string) {
  const el = document.querySelector(`[data-value="${value}"]`) as HTMLElement | null
  if (!el) throw new Error(`no option with data-value=${value}`)
  await user.click(el)
}

describe('QuizStepper', () => {
  it('fires onComplete with the expected pruned answers after answering through', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    renderStepper(onComplete)

    // Unambiguous core path (coffee=black skips chocolate; sour=okay skips
    // sour_wild; no extreme avoid skips the CATA).
    await clickValue(user, 'black') // coffee
    await clickValue(user, 'some') // bitterness_direct
    await clickValue(user, 'strong') // water
    await clickValue(user, 'dry') // sweet_tooth
    await clickValue(user, 'neutral') // roasted
    await clickValue(user, 'strong') // strength
    await clickValue(user, 'okay') // sour_foods
    await clickValue(user, 'okay') // smoked_foods
    await clickValue(user, 'high') // adventure
    // Optional capstone flavor_cues — skip it.
    await user.click(screen.getByTestId('quiz-skip'))

    // Completion screen.
    await user.click(screen.getByTestId('quiz-submit'))

    expect(onComplete).toHaveBeenCalledTimes(1)
    const answers = onComplete.mock.calls[0]![0] as Answers
    expect(prunedAnswers(answers)).toEqual({
      coffee: 'black',
      bitterness_direct: 'some',
      water: 'strong',
      sweet_tooth: 'dry',
      roasted: 'neutral',
      strength: 'strong',
      sour_foods: 'okay',
      smoked_foods: 'okay',
      adventure: 'high',
      flavor_cues: [],
    })
  })

  it('edits an answer from the Summary and returns to the Summary via Done', async () => {
    const user = userEvent.setup()
    renderStepper(vi.fn())
    await walkToSummary(user)
    expect(screen.getByTestId('quiz-submit')).toBeInTheDocument()
    // Open an answered question from the Summary, change it, press Done.
    await user.click(screen.getByTestId('quiz-edit-strength'))
    expect(screen.queryByTestId('quiz-submit')).not.toBeInTheDocument()
    await clickValue(user, 'light') // revisit: selecting does NOT auto-advance
    expect(screen.getByTestId('quiz-done')).toBeInTheDocument()
    await user.click(screen.getByTestId('quiz-done'))
    // Back on the Summary, not submitted.
    expect(screen.getByTestId('quiz-submit')).toBeInTheDocument()
  })

  it('drops an orphaned answer when an edit un-asks its question', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    renderStepper(onComplete)
    await clickValue(user, 'milk_based') // coffee -> chocolate becomes asked
    await clickValue(user, 'milk') // answer chocolate
    await walkToSummary(user)
    expect(screen.getByTestId('quiz-edit-chocolate')).toBeInTheDocument()
    // Change coffee to black, which un-asks chocolate.
    await user.click(screen.getByTestId('quiz-edit-coffee'))
    await clickValue(user, 'black')
    await user.click(screen.getByTestId('quiz-done'))
    await user.click(screen.getByTestId('quiz-submit'))
    const answers = onComplete.mock.calls[0]![0] as Answers
    expect(answers).not.toHaveProperty('chocolate')
    expect(answers.coffee).toBe('black')
  })

  it('restores in-progress answers from localStorage', () => {
    localStorage.setItem('quiz_key', JSON.stringify({ coffee: 'black' }))
    renderStepper(vi.fn(), 'quiz_key')
    // coffee was restored, so the next unanswered question (bitterness_direct) shows.
    expect(screen.getByLabelText(en.onboarding.questions.bitterness_direct)).toBeInTheDocument()
  })

  it('ignores a corrupt (array) persisted payload', () => {
    localStorage.setItem('quiz_key', '[1,2,3]')
    renderStepper(vi.fn(), 'quiz_key')
    // Falls back to a fresh quiz starting at the first question (coffee).
    expect(screen.getByLabelText(en.onboarding.questions.coffee)).toBeInTheDocument()
  })

  it('does not auto-advance on keyboard selection (only pointer)', () => {
    renderStepper(vi.fn())
    const first = document.querySelector('input[type="radio"]') as HTMLElement
    // Keyboard-style activation fires click with detail 0 (no pointer).
    fireEvent.click(first, { detail: 0 })
    // Still on coffee, and an explicit Next has appeared for keyboard users.
    expect(screen.getByLabelText(en.onboarding.questions.coffee)).toBeInTheDocument()
    expect(screen.getByTestId('quiz-next')).toBeInTheDocument()
  })

  it('steps back, restoring the previous question', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    renderStepper(onComplete)

    await clickValue(user, 'black') // coffee answered -> now on bitterness_direct
    expect(screen.getByLabelText(en.onboarding.questions.bitterness_direct)).toBeInTheDocument()

    await user.click(screen.getByTestId('quiz-back'))
    // Back on the coffee question; back button no longer shown at the start.
    expect(screen.getByLabelText(en.onboarding.questions.coffee)).toBeInTheDocument()
    expect(screen.queryByTestId('quiz-back')).not.toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })
})
