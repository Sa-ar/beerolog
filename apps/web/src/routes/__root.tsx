import { ClerkProvider } from '@clerk/tanstack-react-start'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { AppHeader } from '../components/AppHeader'
import { AuthTokenBridge } from '../components/AuthTokenBridge'
import '../styles.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''

export const Route = createRootRoute({
  shellComponent: RootDocument,
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
      <body className="min-h-screen bg-gradient-to-b from-amber-50 to-white text-neutral-900">
        <ClerkProvider {...clerkProps}>
          <AuthTokenBridge />
          <AppHeader />
          {children}
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
