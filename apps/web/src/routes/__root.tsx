import { ClerkProvider } from '@clerk/tanstack-react-start'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { I18nextProvider } from 'react-i18next'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { initAnalytics } from '../lib/analytics'
import { IconCatalogProvider } from '@beerolog/icons'
import { AppBottomNav } from '../components/AppBottomNav'
import { AppFooter } from '../components/AppFooter'
import { AppHeader } from '../components/AppHeader'
import { AppSidebar } from '../components/AppSidebar'
import { AgeVerificationGate } from '../components/AgeVerificationGate'
import { CookieNotice } from '../components/CookieNotice'
import { SkipLink } from '../components/SkipLink'
import { AuthTokenBridge } from '../components/AuthTokenBridge'
import { GlobalErrorPage } from '../components/GlobalErrorPage'
import { NotFoundPage } from '../components/NotFoundPage'
import { PostHogIdentitySync } from '../components/PostHogIdentitySync'
import { createI18n } from '../i18n'
import { getQueryClient } from '../lib/query-client'
import { dirFor, getLang } from '../i18n/locale-cookie'
import { getAgeVerified } from '../lib/age-consent-cookie'
import '../styles.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''
const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export const Route = createRootRoute({
  loader: () => ({ lang: getLang(), ageVerified: getAgeVerified() }),
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
  errorComponent: GlobalErrorPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const { lang, ageVerified } = Route.useLoaderData()
  const i18n = useMemo(() => createI18n(lang), [lang])
  const queryClient = getQueryClient()
  // Cookieless PostHog for growth-loop events; no-op until VITE_POSTHOG_PROJECT_TOKEN is set.
  useEffect(() => initAnalytics(), [])
  // signInUrl points Clerk's RedirectToSignIn (and friends) at our own /signin
  // page instead of Clerk's hosted Account Portal.
  const clerkProps = publishableKey ? { publishableKey, signInUrl: '/signin' } : {}

  return (
    <html lang={lang} dir={dirFor(lang)}>
      <head>
        <HeadContent />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=Caveat:wght@600;700&family=Secular+One&family=Gveret+Levin+AlefAlefAlef&display=swap"
        />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>{lang === 'he' ? 'בירולוג' : 'Beerolog'}</title>
      </head>
      <body className="flex min-h-dvh flex-col text-neutral-900">
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <SkipLink />
            <ClerkProvider {...clerkProps}>
              <IconCatalogProvider apiUrl={apiUrl}>
                <AuthTokenBridge />
                <PostHogIdentitySync />
                <AgeVerificationGate initialVerified={ageVerified} />
                <div className="flex min-h-0 flex-1 flex-col">
                  <AppHeader />
                  <div className="flex min-h-0 flex-1">
                    <AppSidebar />
                    <div
                      id="main-content"
                      tabIndex={-1}
                      className="flex min-w-0 flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] outline-none md:pb-0"
                    >
                      {children}
                    </div>
                  </div>
                </div>
                <AppBottomNav />
                <AppFooter />
                <CookieNotice />
              </IconCatalogProvider>
            </ClerkProvider>
          </QueryClientProvider>
        </I18nextProvider>
        <Analytics />
        <SpeedInsights />
        <Scripts />
      </body>
    </html>
  )
}
