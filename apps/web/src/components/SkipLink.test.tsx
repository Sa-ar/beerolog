import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithI18n } from '../test/render'
import { SkipLink } from './SkipLink'

describe('SkipLink', () => {
  it('renders a link that targets the main content region', () => {
    renderWithI18n(<SkipLink />, 'en')
    const link = screen.getByRole('link', { name: /skip to (main )?content/i })
    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('renders the Hebrew label', () => {
    renderWithI18n(<SkipLink />, 'he')
    expect(screen.getByRole('link')).toHaveTextContent('דלג לתוכן')
  })
})
