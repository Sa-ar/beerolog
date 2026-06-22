import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it, vi, beforeAll } from 'vitest'
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

function renderStepper(onComplete: (a: Answers) => void) {
  return render(
    <I18nextProvider i18n={i18n}>
      <QuizStepper onComplete={onComplete} />
    </I18nextProvider>,
  )
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
    await clickValue(user, 'strong') // water
    await clickValue(user, 'dry') // sweet_tooth
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
      water: 'strong',
      sweet_tooth: 'dry',
      strength: 'strong',
      sour_foods: 'okay',
      smoked_foods: 'okay',
      adventure: 'high',
      flavor_cues: [],
    })
  })

  it('steps back, restoring the previous question', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    renderStepper(onComplete)

    await clickValue(user, 'black') // coffee answered -> now on water
    expect(screen.getByLabelText(en.onboarding.questions.water)).toBeInTheDocument()

    await user.click(screen.getByTestId('quiz-back'))
    // Back on the coffee question; back button no longer shown at the start.
    expect(screen.getByLabelText(en.onboarding.questions.coffee)).toBeInTheDocument()
    expect(screen.queryByTestId('quiz-back')).not.toBeInTheDocument()
    expect(onComplete).not.toHaveBeenCalled()
  })
})
