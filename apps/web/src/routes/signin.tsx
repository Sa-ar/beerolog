import { SignIn } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/signin')({
  validateSearch: (search: Record<string, unknown>) => ({
    next: typeof search['next'] === 'string' ? search['next'] : '/profile',
  }),
  component: SignInPage,
})

function SignInPage() {
  const { next } = Route.useSearch()

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-neutral-900">🍻 Beerolog</h1>
        <p className="mt-2 text-neutral-500">
          Sign in with a social account to save your taste profile and beer picks.
        </p>
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
