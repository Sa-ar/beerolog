import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../i18n'
import type { Lang } from '../i18n/locale-cookie'

// Render a component inside a real i18next instance for the given language.
export function renderWithI18n(ui: ReactElement, lang: Lang = 'en') {
  return render(<I18nextProvider i18n={createI18n(lang)}>{ui}</I18nextProvider>)
}
