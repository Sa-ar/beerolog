import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

const navigate = vi.fn()
const apiFetch = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (opts: { component: unknown }) => opts,
  useNavigate: () => navigate,
  Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
}))

vi.mock('@clerk/tanstack-react-start', () => ({
  RedirectToSignIn: () => null,
  Show: ({ when, children }: { when: string; children: ReactNode }) =>
    when === 'signed-in' ? <>{children}</> : null,
}))

vi.mock('@beerolog/shared', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@beerolog/shared')>()),
  apiFetch: (...args: unknown[]) => apiFetch(...args),
}))

vi.mock('../components/QuizStepper', () => ({
  QuizStepper: ({
    onComplete,
    children,
  }: {
    onComplete: (answers: Record<string, string>) => void
    children?: ReactNode
  }) => (
    <div>
      <button type="button" onClick={() => onComplete({ coffee: 'dark' })}>
        Finish quiz
      </button>
      {children}
    </div>
  ),
}))

const { Route } = await import('../routes/onboarding')
const OnboardingPage = (Route as unknown as { component: () => ReactNode }).component

describe('onboarding handoff', () => {
  beforeEach(() => {
    navigate.mockReset()
    apiFetch.mockReset()
    apiFetch.mockResolvedValue({ ok: true })
  })

  it('navigates to the home dashboard after a successful save', async () => {
    const user = userEvent.setup()
    renderWithI18n(<OnboardingPage />, 'en')
    await user.click(screen.getByRole('button', { name: /finish quiz/i }))
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: '/' })
    })
  })
})
