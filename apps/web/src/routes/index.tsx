import { useAuth, useUser } from '@clerk/tanstack-react-start'
import { CatalogIcon } from '@beerolog/icons'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '@beerolog/ui'
import { PAGE_MAIN } from '../lib/page-shell'
import { TasteProfileEmptyState } from '../components/TasteProfileEmptyState'
import { TasteProfileErrorState } from '../components/TasteProfileErrorState'
import { TasteProfileLoadingState } from '../components/TasteProfileLoadingState'
import { TasteProfileSummary } from '../components/TasteProfileSummary'
import type { BaselineLoadErrorReason } from '../lib/load-baseline-taste'
import { loadBaselineTaste } from '../lib/load-baseline-taste'
import { clearBaselineCache, readBaselineCache, writeBaselineCache } from '../lib/baseline-cache'
import type { BaselineTaste } from '../lib/baseline-taste'
import { timeAwareGreeting, isStaleProfile } from '../lib/baseline-taste'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Labels come from home.steps.<step>.{title,detail}; icon keyed by step.
const STEPS = ['quiz', 'vibe', 'picks'] as const

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
    return <SessionLoading />
  }

  if (signedIn) {
    return (
      <main className={`${PAGE_MAIN} py-10 sm:py-12`}>
        <SignedInHome firstName={user?.firstName} />
      </main>
    )
  }

  return (
    <main className={`${PAGE_MAIN} gap-8 py-8 sm:gap-10 sm:py-12`}>
      <VisitorHome />
    </main>
  )
}

function SignedInHome({ firstName }: { firstName: string | null | undefined }) {
  const { getToken, isLoaded: authLoaded, userId } = useAuth()
  const [profileState, setProfileState] = useState<ProfileState>({ status: 'idle' })
  const [retryCount, setRetryCount] = useState(0)
  const { t } = useTranslation()
  const greeting = timeAwareGreeting(t, firstName)

  useEffect(() => {
    if (!authLoaded) return
    let cancelled = false
    // Seed from cache so the profile shows instantly; only show the loading
    // screen on a true cold start (no cached profile yet).
    const cached = readBaselineCache(userId)
    // A cached profile from an older model is stale — force the new quiz.
    const usableCache = cached && !isStaleProfile(cached) ? cached : null
    setProfileState(usableCache ? { status: 'ready', baseline: usableCache } : { status: 'loading' })
    void (async () => {
      const result = await loadBaselineTaste(() => getToken())
      if (cancelled) return
      if (result.status === 'ready') {
        if (isStaleProfile(result.baseline)) {
          clearBaselineCache(userId)
          setProfileState({ status: 'empty' })
          return
        }
        writeBaselineCache(userId, result.baseline)
        setProfileState({ status: 'ready', baseline: result.baseline })
        return
      }
      if (result.status === 'empty') {
        clearBaselineCache(userId)
        setProfileState({ status: 'empty' })
        return
      }
      // Revalidation failed: keep showing the cached profile rather than flashing
      // an error; only surface the error when we have nothing to show.
      if (!usableCache) setProfileState({ status: 'error', reason: result.reason })
    })()
    return () => {
      cancelled = true
    }
  }, [authLoaded, getToken, userId, retryCount])

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

function SessionLoading() {
  const { t } = useTranslation()
  return (
    <main className={`${PAGE_MAIN} py-12`}>
      <p className="text-center text-sm text-neutral-400 animate-pulse">
        {t('home.loadingSession')}
      </p>
    </main>
  )
}

function VisitorHome() {
  const { t } = useTranslation()
  return (
    <>
      <section className="space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
          {t('home.eyebrow')}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-balance text-neutral-900 sm:text-4xl md:text-5xl">
          {t('home.headline')}
        </h1>
        <p className="mx-auto max-w-lg text-base text-neutral-600 sm:text-lg">{t('home.subhead')}</p>
      </section>

      <section className="space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-neutral-900">{t('home.howItWorks')}</h2>
          <p className="mt-1 text-sm text-neutral-600">{t('home.howItWorksHint')}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 sm:gap-6">
          {STEPS.map((step) => (
            <Card
              key={step}
              className="flex flex-col items-center gap-2 p-4 text-center transition-colors hover:border-brand-500 hover:bg-brand-50"
            >
              <CatalogIcon group="journey" iconKey={step} className="h-9 w-9" />
              <div className="min-w-0">
                <p className="font-medium text-neutral-900">{t(`home.steps.${step}.title`)}</p>
                <p className="mt-1 text-sm text-neutral-600">{t(`home.steps.${step}.detail`)}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 sm:mx-auto sm:max-w-md lg:max-w-lg">
        <Link to="/signin/$" params={{ _splat: '' }} search={{ next: '/onboarding' }}>
          <Button className="w-full" size="lg">
            {t('home.cta')}
          </Button>
        </Link>
        <Link to="/try">
          <Button className="w-full" size="lg" variant="outline">
            {t('home.tryCta')}
          </Button>
        </Link>
        <p className="text-center text-sm text-neutral-500">{t('home.ctaHint')}</p>
      </section>
    </>
  )
}
