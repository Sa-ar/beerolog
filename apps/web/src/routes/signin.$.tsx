import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { PAGE_MAIN } from '../lib/page-shell'

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
    <main className={`${PAGE_MAIN} items-center justify-center gap-8 py-8 sm:py-12`}>
      <div className="w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-neutral-900 sm:text-4xl">🍻 {t('signin.title')}</h1>
        <p className="mt-2 text-sm text-neutral-500 sm:text-base">{t('signin.subtitle')}</p>
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
