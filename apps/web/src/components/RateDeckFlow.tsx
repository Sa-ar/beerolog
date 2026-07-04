/**
 * The /rate deck experience: fetch a deck, rate beers one at a time, batch-
 * submit on completion. Data + progression live in useRateDeck; this component
 * is presentation only.
 */
import { ProgressRing } from '@beerolog/ui'
import { useTranslation } from 'react-i18next'
import { PAGE_SHELL_X } from '../lib/page-shell'
import { useRateDeck } from '../lib/rate-deck'
import { RateBeerCard } from './RateBeerCard'

// Navigates, so it's a real <a> (accessibility) styled like the default Button.
const LINK_BUTTON =
  'mt-2 inline-flex h-11 items-center justify-center gap-2 rounded bg-brand-500 px-5 text-base font-medium text-[hsl(26_30%_10%)] transition-colors hover:bg-brand-600'

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mx-auto max-w-md py-8 text-center ${PAGE_SHELL_X}`}>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Rate beers</h1>
      {children}
    </div>
  )
}

export function RateDeckFlow() {
  const { t } = useTranslation()
  const { state, rate } = useRateDeck()

  if (state.status === 'loading') {
    return <Shell>{t('rate.loading', 'Loading beers…')}</Shell>
  }
  if (state.status === 'submitting') {
    return <Shell>{t('rate.saving', 'Saving your ratings…')}</Shell>
  }
  if (state.status === 'error') {
    return (
      <Shell>
        <p role="alert">{t('rate.error', "Couldn't load the deck. Try again.")}</p>
      </Shell>
    )
  }
  if (state.status === 'empty') {
    return (
      <Shell>
        <p>{t('rate.empty', "No beers to rate right now — you've rated them all!")}</p>
        <a href="/recommendations" className="text-brand-600 underline">
          {t('rate.backToRecs', 'Back to recommendations')}
        </a>
      </Shell>
    )
  }
  if (state.status === 'done') {
    return (
      <Shell>
        <p role="status" className="text-lg font-semibold">
          {t('rate.done', 'Thanks! Your taste profile just got sharper.')}
        </p>
        <a href="/recommendations" className={LINK_BUTTON}>
          {t('rate.seeRecs', 'See fresh recommendations')}
        </a>
      </Shell>
    )
  }

  const beer = state.deck[state.index]!
  const total = state.deck.length
  return (
    <Shell>
      <div className="mb-4 flex justify-center">
        <ProgressRing value={state.index} max={total} label={`${state.index + 1}/${total}`} />
      </div>
      <RateBeerCard key={beer.id} beer={beer} onRate={rate} />
    </Shell>
  )
}
