import { screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithI18n } from '../test/render'

// Mock the router Link boundary to a plain anchor that substitutes route params,
// so the footer can be tested without a full router context.
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    params,
    children,
    className,
  }: {
    to: string
    params?: Record<string, string>
    children: ReactNode
    className?: string
  }) => {
    let href = to
    if (params) {
      for (const [k, v] of Object.entries(params)) href = href.replace(`$${k}`, v)
    }
    return (
      <a href={href} className={className}>
        {children}
      </a>
    )
  },
}))

// Imported after the mock is registered.
const { AppFooter } = await import('./AppFooter')

describe('AppFooter', () => {
  it('links to all four legal pages', () => {
    renderWithI18n(<AppFooter />, 'en')
    const hrefs = ['/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/accessibility']
    for (const href of hrefs) {
      const link = screen.getByRole('link', { name: new RegExp(href.split('/').pop()!, 'i') })
      expect(link).toHaveAttribute('href', href)
    }
  })
})
