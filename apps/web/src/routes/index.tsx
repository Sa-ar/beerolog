import { useUser } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { buttonVariants, cn, Heading } from '@beerolog/ui'
import { PAGE_MAIN } from '@beerolog/shared'
import { WhatIWantDeck } from '../components/WhatIWantDeck'

export const Route = createFileRoute('/')({
  component: HomePage,
})

// Labels come from home.steps.<step>.{title,detail}; icon keyed by step.
const STEPS = ['quiz', 'scan', 'vibe', 'collect'] as const

function HomePage() {
  const { isLoaded, isSignedIn } = useUser()
  const signedIn = isLoaded && isSignedIn

  if (!isLoaded) {
    return <SessionLoading />
  }

  if (signedIn) {
    return <WhatIWantDeck />
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
            className={cn(
              buttonVariants({ size: 'lg' }),
              'w-full px-12 font-display text-lg font-semibold uppercase tracking-[0.12em] sm:w-auto',
            )}
            to="/signin/$"
            params={{ _splat: '' }}
            search={{ next: '/onboarding' }}
          >
            {t('home.cta')}
          </Link>
          <Link
            className={cn(
              buttonVariants({ size: 'lg', variant: 'outline' }),
              'w-full px-12 font-display text-lg font-semibold uppercase tracking-[0.12em] sm:w-auto',
            )}
            to="/try"
          >
            {t('home.tryCta')}
          </Link>
          <p className="font-script text-lg text-neutral-500">{t('home.ctaHint')}</p>
        </div>
      </div>
    </section>
  )
}
