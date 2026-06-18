import { useAuth, useUser } from '@clerk/tanstack-react-start'
import { CatalogIcon } from '@beerolog/icons'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button, Card } from '@beerolog/ui'
import { TasteProfileEmptyState } from '../components/TasteProfileEmptyState'
import { TasteProfileErrorState } from '../components/TasteProfileErrorState'
import { TasteProfileLoadingState } from '../components/TasteProfileLoadingState'
import { TasteProfileSummary } from '../components/TasteProfileSummary'
import type { BaselineLoadErrorReason } from '../lib/load-baseline-taste'
import { loadBaselineTaste } from '../lib/load-baseline-taste'
import type { BaselineTaste } from '../lib/baseline-taste'
import { timeAwareGreeting } from '../lib/baseline-taste'

export const Route = createFileRoute('/')({
  component: HomePage,
})

const STEPS = [
  {
    step: 'quiz' as const,
    title: 'Quick taste quiz',
    detail: 'Seven everyday food & drink questions — no beer jargon.',
  },
  {
    step: 'vibe' as const,
    title: "Tonight's vibe",
    detail: 'Pick refreshing or cozy, low or high ABV, optional free text.',
  },
  {
    step: 'picks' as const,
    title: 'Your top 5 picks',
    detail: 'Recommendations matched to your saved taste profile.',
  },
] as const

type ProfileState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'ready'; baseline: BaselineTaste }
  | { status: 'error'; reason: BaselineLoadErrorReason }

function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const signedIn = isLoaded && isSignedIn

  if (!isLoaded) {
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-12">
        <p className="text-center text-sm text-neutral-400 animate-pulse">Loading session…</p>
      </main>
    )
  }

  if (signedIn) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10 sm:py-12">
        <SignedInHome firstName={user?.firstName} />
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-10 px-6 py-12">
      <VisitorHome />
    </main>
  )
}

function SignedInHome({ firstName }: { firstName: string | null | undefined }) {
  const { getToken, isLoaded: authLoaded } = useAuth()
  const [profileState, setProfileState] = useState<ProfileState>({ status: 'idle' })
  const [retryCount, setRetryCount] = useState(0)
  const greeting = timeAwareGreeting(firstName)

  useEffect(() => {
    if (!authLoaded) return
    let cancelled = false
    void (async () => {
      setProfileState({ status: 'loading' })
      const result = await loadBaselineTaste(() => getToken())
      if (cancelled) return
      if (result.status === 'ready') {
        setProfileState({ status: 'ready', baseline: result.baseline })
        return
      }
      if (result.status === 'empty') {
        setProfileState({ status: 'empty' })
        return
      }
      setProfileState({ status: 'error', reason: result.reason })
    })()
    return () => {
      cancelled = true
    }
  }, [authLoaded, getToken, retryCount])

  if (!authLoaded || profileState.status === 'loading' || profileState.status === 'idle') {
    return <TasteProfileLoadingState greeting={greeting} />
  }

  if (profileState.status === 'error') {
    return (
      <TasteProfileErrorState
        greeting={greeting}
        reason={profileState.reason}
        onRetry={() => setRetryCount((n) => n + 1)}
      />
    )
  }

  if (profileState.status === 'empty') {
    return <TasteProfileEmptyState greeting={greeting} />
  }

  return <TasteProfileSummary greeting={greeting} baseline={profileState.baseline} />
}

function VisitorHome() {
  return (
    <>
      <section className="space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          Solo taste learning
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
          Find beers you&apos;ll actually enjoy
        </h1>
        <p className="mx-auto max-w-lg text-lg text-neutral-600">
          Beerolog learns how you taste, then matches every session to what you want
          right now.
        </p>
      </section>

      <section className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900">How it works</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Sign in so your quiz answers and picks are saved to your profile.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((step) => (
            <Card
              key={step.title}
              className="flex flex-col items-center gap-2 p-4 text-center transition-colors hover:border-brand-500 hover:bg-brand-50"
            >
              <CatalogIcon group="journey" iconKey={step.step} className="h-9 w-9" />
              <div>
                <p className="font-medium text-neutral-900">{step.title}</p>
                <p className="mt-1 text-sm text-neutral-600">{step.detail}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Link to="/signin" search={{ next: '/onboarding' }}>
          <Button className="w-full" size="lg">
            Sign in to start →
          </Button>
        </Link>
        <p className="text-center text-sm text-neutral-500">
          Free to try. Your taste profile stays with your account.
        </p>
      </section>
    </>
  )
}
