import { ClerkProvider } from '@clerk/tanstack-react-start'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { useMemo } from 'react'
import { I18nextProvider } from 'react-i18next'
import { IconCatalogProvider } from '@beerolog/icons'
import { AppFooter } from '../components/AppFooter'
import { AppHeader } from '../components/AppHeader'
import { AgeVerificationGate } from '../components/AgeVerificationGate'
import { CookieNotice } from '../components/CookieNotice'
import { SkipLink } from '../components/SkipLink'
import { AuthTokenBridge } from '../components/AuthTokenBridge'
import { GlobalErrorPage } from '../components/GlobalErrorPage'
import { NotFoundPage } from '../components/NotFoundPage'
import { createI18n } from '../i18n'
import { dirFor, getLang } from '../i18n/locale-cookie'
import { getAgeVerified } from '../lib/age-consent-cookie'
import '../styles.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''
const apiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export const Route = createRootRoute({
  loader: () => ({ lang: getLang(), ageVerified: getAgeVerified() }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
  errorComponent: GlobalErrorPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { lang, ageVerified } = Route.useLoaderData()
  const i18n = useMemo(() => createI18n(lang), [lang])
  // signInUrl points Clerk's RedirectToSignIn (and friends) at our own /signin
  // page instead of Clerk's hosted Account Portal.
  const clerkProps = publishableKey ? { publishableKey, signInUrl: '/signin' } : {}

  return (
    <html lang={lang} dir={dirFor(lang)}>
      <head>
        <HeadContent />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{lang === 'he' ? 'בירולוג' : 'Beerolog'}</title>
      </head>
      <body className="flex min-h-dvh flex-col bg-gradient-to-b from-amber-50 to-white text-neutral-900">
        <I18nextProvider i18n={i18n}>
          <SkipLink />
          <ClerkProvider {...clerkProps}>
            <IconCatalogProvider apiUrl={apiUrl}>
              <AuthTokenBridge />
              <AgeVerificationGate initialVerified={ageVerified} />
              <AppHeader />
              <div id="main-content" tabIndex={-1} className="flex flex-1 flex-col outline-none">
                {children}
              </div>
              <AppFooter />
              <CookieNotice />
            </IconCatalogProvider>
          </ClerkProvider>
        </I18nextProvider>
        <Scripts />
      </body>
    </html>
  )
}
