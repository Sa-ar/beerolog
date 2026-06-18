import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithI18n } from '../test/render'
import { LegalPage } from './LegalPage'

describe('LegalPage', () => {
  it('renders the page title as an h1 in English', () => {
    renderWithI18n(<LegalPage slug="privacy" />, 'en')
    expect(
      screen.getByRole('heading', { level: 1, name: /privacy policy/i }),
    ).toBeInTheDocument()
  })

  it('renders the Hebrew title for the same slug', () => {
    renderWithI18n(<LegalPage slug="privacy" />, 'he')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('מדיניות פרטיות')
  })
})
