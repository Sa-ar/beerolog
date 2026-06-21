import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest'
import en from '../i18n/locales/en/common.json'
import { AgeVerificationGate } from './AgeVerificationGate'

vi.mock('../lib/age-consent-cookie', () => ({
  setAgeVerified: vi.fn(),
}))

const useAuthMock = vi.fn(() => ({ isLoaded: true, isSignedIn: false }))
vi.mock('@clerk/tanstack-react-start', () => ({
  useAuth: () => useAuthMock(),
}))

import { setAgeVerified } from '../lib/age-consent-cookie'

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

function renderGate(initialVerified = false) {
  return render(
    <I18nextProvider i18n={i18n}>
      <AgeVerificationGate initialVerified={initialVerified} />
    </I18nextProvider>,
  )
}

describe('AgeVerificationGate', () => {
  beforeEach(() => {
    vi.mocked(setAgeVerified).mockClear()
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: false })
  })

  it('renders nothing when signed in', () => {
    useAuthMock.mockReturnValue({ isLoaded: true, isSignedIn: true })
    const { container } = renderGate(false)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when already verified', () => {
    const { container } = renderGate(true)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows the age gate when unverified', () => {
    renderGate(false)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(en.ageGate.title)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: en.ageGate.confirm })).toBeInTheDocument()
  })

  it('confirms age and persists consent', async () => {
    const user = userEvent.setup()
    renderGate(false)

    await user.click(screen.getByRole('button', { name: en.ageGate.confirm }))

    expect(setAgeVerified).toHaveBeenCalledOnce()
  })

  it('shows denial state when user is underage', async () => {
    const user = userEvent.setup()
    renderGate(false)

    await user.click(screen.getByRole('button', { name: en.ageGate.deny }))

    expect(screen.getByText(en.ageGate.deniedTitle)).toBeInTheDocument()
    expect(screen.getByText(en.ageGate.deniedBody)).toBeInTheDocument()
    expect(setAgeVerified).not.toHaveBeenCalled()
  })
})
