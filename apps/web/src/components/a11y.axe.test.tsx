import type { ReactElement, ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { renderWithI18n } from '../test/render'

// Mock the external boundaries so the compliance surfaces render headlessly.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="/mock">{children}</a>,
}))
vi.mock('@clerk/tanstack-react-start', () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}))
vi.mock('../lib/api-client/client', () => ({
  apiClient: { DELETE: vi.fn(), GET: vi.fn() },
}))

const { LegalPage } = await import('./LegalPage')
const { AppFooter } = await import('./AppFooter')
const { SkipLink } = await import('./SkipLink')
const { QuizChips } = await import('./QuizChips')
const { CookieNotice } = await import('./CookieNotice')
const { DeleteAccountCard } = await import('./DeleteAccountCard')
const { ExportDataCard } = await import('./ExportDataCard')

async function expectNoViolations(ui: ReactElement) {
  const { container } = renderWithI18n(ui, 'en')
  expect(await axe(container)).toHaveNoViolations()
}

describe('accessibility (axe) — compliance surfaces', () => {
  it.each(['privacy', 'terms', 'cookies', 'accessibility'] as const)(
    'legal page: %s has no critical violations',
    async (slug) => {
      await expectNoViolations(<LegalPage slug={slug} />)
    },
  )

  it('footer legal links', async () => {
    await expectNoViolations(<AppFooter />)
  })

  it('skip link', async () => {
    await expectNoViolations(<SkipLink />)
  })

  it('quiz control', async () => {
    await expectNoViolations(
      <QuizChips
        title="How do you take coffee?"
        group="coffee"
        options={['black', 'milk']}
        value="black"
        onChange={vi.fn()}
      />,
    )
  })

  it('cookie notice', async () => {
    await expectNoViolations(<CookieNotice />)
  })

  it('delete account panel', async () => {
    await expectNoViolations(<DeleteAccountCard />)
  })

  it('export data panel', async () => {
    await expectNoViolations(<ExportDataCard />)
  })
})
