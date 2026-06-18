import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

// Splat route so Clerk's path routing can mount its sub-paths
// (/signin/sso-callback, /signin/factor-one, reset, etc.) under /signin.
export const Route = createFileRoute('/signin/$')({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search['next'] === 'string' ? search['next'] : '/',
  }),
  component: SignInPage,
})

function SignInPage() {
  const { next } = Route.useSearch()
  const { t } = useTranslation()

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900">🍻 {t('signin.title')}</h1>
        <p className="mt-2 text-neutral-500">{t('signin.subtitle')}</p>
      </div>
      <SignIn
        routing="path"
        path="/signin"
        signUpUrl="/signin"
        forceRedirectUrl={next}
        appearance={{
          elements: {
            rootBox: 'mx-auto w-full max-w-md',
            card: 'shadow-lg rounded-2xl',
          },
        }}
      />
    </main>
  )
}
