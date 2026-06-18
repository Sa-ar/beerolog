import { ClerkProvider } from '@clerk/tanstack-react-start'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { IconCatalogProvider } from '@beerolog/icons'
import { AppHeader } from '../components/AppHeader'
import { AuthTokenBridge } from '../components/AuthTokenBridge'
import { GlobalErrorPage } from '../components/GlobalErrorPage'
import { NotFoundPage } from '../components/NotFoundPage'
import '../styles.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''
const apiUrl =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

export const Route = createRootRoute({
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
  errorComponent: GlobalErrorPage,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const clerkProps = publishableKey ? { publishableKey } : {}

  return (
    <html lang="en">
      <head>
        <HeadContent />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Beerolog</title>
      </head>
      <body className="flex min-h-screen flex-col bg-gradient-to-b from-amber-50 to-white text-neutral-900">
        <ClerkProvider {...clerkProps}>
          <IconCatalogProvider apiUrl={apiUrl}>
            <AuthTokenBridge />
            <AppHeader />
            {children}
          </IconCatalogProvider>
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
