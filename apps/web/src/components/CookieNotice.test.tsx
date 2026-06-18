import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/legal/cookies">{children}</a>,
}))

const { CookieNotice } = await import('./CookieNotice')

beforeEach(() => {
  localStorage.clear()
})

describe('CookieNotice', () => {
  it('shows a non-blocking disclosure on first visit', () => {
    renderWithI18n(<CookieNotice />, 'en')
    expect(screen.getByRole('region', { name: /cookie/i })).toBeInTheDocument()
    // Non-blocking: it is not a modal dialog.
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stays dismissed after acknowledgement', async () => {
    const user = userEvent.setup()
    const { unmount } = renderWithI18n(<CookieNotice />, 'en')
    await user.click(screen.getByRole('button', { name: /got it/i }))
    expect(screen.queryByRole('region', { name: /cookie/i })).toBeNull()
    unmount()

    renderWithI18n(<CookieNotice />, 'en')
    expect(screen.queryByRole('region', { name: /cookie/i })).toBeNull()
  })
})
