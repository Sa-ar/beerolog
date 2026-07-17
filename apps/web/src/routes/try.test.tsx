import type React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it, vi, beforeAll, beforeEach } from 'vitest'
import en from '../i18n/locales/en/common.json'

// Mock the network layer used by fetchGuestRecommendations. apiFetch returns a
// Response-like object with ok + json().
const apiFetchMock = vi.fn(async () => ({
  ok: true,
  json: async () => ({
    results: [
      { id: 'b1', name: 'Test Lager', brewery: 'Acme', style: 'lager', abv: 5, color: 'gold', match_percent: 88, why: 'crisp' },
    ],
    unlocked_count: 3,
  }),
}))
vi.mock('../lib/api-fetch', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...(args as [])),
}))

// TanStack's createFileRoute pulls in router internals; stub it so we can render
// the page component directly.
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: unknown }) => opts,
}))

import { Route } from './try'
import { GUEST_ANSWERS_KEY } from '../lib/guest-answers'

const TryPage = (Route as unknown as { component: () => React.ReactElement }).component

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

function renderTry() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TryPage />
    </I18nextProvider>,
  )
}

async function clickValue(user: ReturnType<typeof userEvent.setup>, value: string) {
  const el = document.querySelector(`[data-value="${value}"]`) as HTMLElement | null
  if (!el) throw new Error(`no option with data-value=${value}`)
  await user.click(el)
}

describe('/try guest preview', () => {
  beforeEach(() => {
    localStorage.clear()
    apiFetchMock.mockClear()
  })

  it('writes pruned answers to localStorage and calls the guest fetch on completion', async () => {
    const user = userEvent.setup()
    renderTry()

    await clickValue(user, 'black') // coffee
    await clickValue(user, 'some') // bitterness_direct
    await clickValue(user, 'strong') // water
    await clickValue(user, 'dry') // sweet_tooth
    await clickValue(user, 'neutral') // roasted
    await clickValue(user, 'strong') // strength
    await clickValue(user, 'okay') // sour_foods
    await clickValue(user, 'okay') // smoked_foods
    await clickValue(user, 'high') // adventure
    await user.click(screen.getByTestId('quiz-skip')) // flavor_cues
    await user.click(screen.getByTestId('quiz-submit'))

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1))
    expect(apiFetchMock).toHaveBeenCalledWith(
      '/guest-recommendations',
      expect.objectContaining({ method: 'POST' }),
    )

    const stored = JSON.parse(localStorage.getItem(GUEST_ANSWERS_KEY) as string)
    expect(stored).toEqual({
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

    // Minimal results placeholder renders names + unlocked_count.
    expect(await screen.findByTestId('try-results')).toBeInTheDocument()
    expect(screen.getByText('Test Lager')).toBeInTheDocument()
  })

  it('offers skip-to-results when stored answers already exist', async () => {
    localStorage.setItem(
      GUEST_ANSWERS_KEY,
      JSON.stringify({ coffee: 'black', water: 'strong' }),
    )
    const user = userEvent.setup()
    renderTry()

    // Quiz is NOT shown immediately; the resume choice is.
    expect(screen.queryByTestId('quiz-question')).not.toBeInTheDocument()
    const seeResults = screen.getByTestId('try-see-results')
    expect(seeResults).toBeInTheDocument()

    await user.click(seeResults)
    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1))
    expect(await screen.findByTestId('try-results')).toBeInTheDocument()
  })
})
