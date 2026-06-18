import { ClerkProvider } from '@clerk/tanstack-react-start'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { I18nextProvider } from 'react-i18next'
import { IconCatalogProvider } from '@beerolog/icons'
import { AppHeader } from '../components/AppHeader'
import { AuthTokenBridge } from '../components/AuthTokenBridge'
import { GlobalErrorPage } from '../components/GlobalErrorPage'
import { NotFoundPage } from '../components/NotFoundPage'
import { createI18n } from '../i18n'
import { dirFor, getLang } from '../i18n/locale-cookie'
import '../styles.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''
const apiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export const Route = createRootRoute({
  loader: () => ({ lang: getLang() }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
  errorComponent: GlobalErrorPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { lang } = Route.useLoaderData()
  const i18n = useMemo(() => createI18n(lang), [lang])
  const clerkProps = publishableKey ? { publishableKey } : {}

  return (
    <html lang={lang} dir={dirFor(lang)}>
      <head>
        <HeadContent />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{lang === 'he' ? 'בירולוג' : 'Beerolog'}</title>
      </head>
      <body className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50 to-white text-neutral-900">
        <I18nextProvider i18n={i18n}>
          <ClerkProvider {...clerkProps}>
            <IconCatalogProvider apiUrl={apiUrl}>
              <AuthTokenBridge />
              <AppHeader />
              {children}
            </IconCatalogProvider>
          </ClerkProvider>
        </I18nextProvider>
        <Scripts />
      </body>
    </html>
  )
}
