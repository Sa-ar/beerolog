import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { createI18n } from '../i18n'
import type { Lang } from '../i18n/locale-cookie'

// Render a component inside a real i18next instance + a fresh QueryClient (no
// retries, no cross-test cache leakage) for the given language.
export function renderWithI18n(ui: ReactElement, lang: Lang = 'en') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18n(lang)}>{ui}</I18nextProvider>
    </QueryClientProvider>,
  )
}
