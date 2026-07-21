import { useAuth, useUser } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Button, Heading } from '@beerolog/ui'
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

// Carries the typed failure reason through react-query's error channel so the
// error screen can show a specific message.
class BaselineError extends Error {
  constructor(readonly reason: BaselineLoadErrorReason) {
    super(reason)
  }
}

type BaselineResult = { ready: BaselineTaste } | { empty: true }

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
    <main className={`${PAGE_MAIN} py-8 sm:py-14`}>
      <VisitorHome />
    </main>
  )
}

// Hand-drawn chalk underline under the sign's headline.
function ChalkRule() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 240 12"
      className="mx-auto h-3 w-44 text-brand-300"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <path d="M4 8 C 60 2, 100 2, 130 6 S 200 11, 236 4" />
    </svg>
  )
}

function SignedInHome({ firstName }: { firstName: string | null | undefined }) {
  const { getToken, isLoaded: authLoaded, userId } = useAuth()
  const { t } = useTranslation()
  const greeting = timeAwareGreeting(t, firstName)

  const profile = useQuery<BaselineResult, BaselineError>({
    queryKey: ['baseline', userId],
    enabled: authLoaded,
    staleTime: 0,
    retry: false,
    // Seed from cache so the profile shows instantly; a stale-model cache is
    // ignored so we force the improved quiz. initialDataUpdatedAt: 0 keeps it
    // stale so we always revalidate in the background.
    initialData: () => {
      const cached = readBaselineCache(userId)
      return cached && !isStaleProfile(cached) ? { ready: cached } : undefined
    },
    initialDataUpdatedAt: 0,
    queryFn: async () => {
      const result = await loadBaselineTaste(() => getToken())
      if (result.status === 'error') throw new BaselineError(result.reason)
      if (result.status === 'empty' || isStaleProfile(result.baseline)) {
        clearBaselineCache(userId)
        return { empty: true }
      }
      writeBaselineCache(userId, result.baseline)
      return { ready: result.baseline }
    },
  })

  // Cold start (nothing cached, still fetching) shows the loading screen.
  if (!authLoaded || profile.isPending) {
    return <TasteProfileLoadingState greeting={greeting} />
  }

  // Revalidation failed with no cached profile to fall back on. When a cached
  // profile exists react-query keeps it in `data`, so we fall through and keep
  // showing it rather than flashing an error.
  if (profile.isError && !profile.data) {
    return (
      <TasteProfileErrorState
        greeting={greeting}
        reason={profile.error.reason}
        onRetry={() => void profile.refetch()}
      />
    )
  }

  if (profile.data && 'empty' in profile.data) {
    return <TasteProfileEmptyState greeting={greeting} />
  }

  if (!profile.data || !('ready' in profile.data)) {
    return <TasteProfileLoadingState greeting={greeting} />
  }

  return <TasteProfileSummary greeting={greeting} baseline={profile.data.ready} />
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
    <section className="mx-auto w-full max-w-2xl">
      {/* The board: an inset slate framed in gold, lit from above by the body backdrop. */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-brand-700/60 bg-[hsl(25_24%_7%)] px-6 py-10 shadow-[0_24px_70px_-24px_rgba(0,0,0,0.85)] sm:px-12 sm:py-14">
        {/* faint chalk-dust frame line */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-3 rounded-xl border border-brand-700/25 sm:inset-4"
        />

        {/* The sign */}
        <div className="relative space-y-3 text-center">
          <p className="font-script text-2xl leading-none text-brand-300 sm:text-3xl">
            {t('home.eyebrow')}
          </p>
          <Heading className="font-display text-4xl font-semibold uppercase tracking-[0.04em] sm:text-6xl">
            {t('home.headline')}
          </Heading>
          <ChalkRule />
          <p className="mx-auto max-w-md text-base text-neutral-500">{t('home.subhead')}</p>
        </div>

        {/* Today's menu: the steps as numbered pours with dotted leader lines. */}
        <div className="relative mt-12">
          <div className="flex items-baseline justify-between gap-3 border-b border-brand-700/30 pb-2">
            <Heading level={2} className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-300">
              {t('home.howItWorks')}
            </Heading>
            <p className="font-script text-lg text-neutral-500">{t('home.howItWorksHint')}</p>
          </div>

          <ol className="mt-3">
            {STEPS.map((step, i) => (
              <li key={step}>
                <div className="group rounded-md px-2 py-3 transition-colors hover:bg-neutral-100">
                  <div className="flex items-baseline gap-3">
                    <span className="font-display text-xl font-semibold tabular-nums text-brand-300">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-lg uppercase tracking-wide text-neutral-900">
                      {t(`home.steps.${step}.title`)}
                    </span>
                    <span
                      aria-hidden
                      className="flex-1 translate-y-[-0.25em] border-b border-dotted border-neutral-300"
                    />
                  </div>
                  <p className="mt-1 ps-9 text-sm text-neutral-500">
                    {t(`home.steps.${step}.detail`)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Call: a solid chalk-gold button. */}
        <div className="relative mt-12 flex flex-col items-center gap-3">
          <Link
            className="w-full sm:w-auto"
            to="/signin/$"
            params={{ _splat: '' }}
            search={{ next: '/onboarding' }}
          >
            <Button
              className="w-full px-12 font-display text-lg font-semibold uppercase tracking-[0.12em] sm:w-auto"
              size="lg"
            >
              {t('home.cta')}
            </Button>
          </Link>
          <Link className="w-full sm:w-auto" to="/try">
            <Button
              className="w-full px-12 font-display text-lg font-semibold uppercase tracking-[0.12em] sm:w-auto"
              size="lg"
              variant="outline"
            >
              {t('home.tryCta')}
            </Button>
          </Link>
          <p className="font-script text-lg text-neutral-500">{t('home.ctaHint')}</p>
        </div>
      </div>
    </section>
  )
}
