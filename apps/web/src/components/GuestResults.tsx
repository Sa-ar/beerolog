/**
 * Guest preview results: the first `unlockedCount` matches render as fully
 * visible, interactive cards; everything from index `unlockedCount` onward is
 * shown blurred + dimmed behind a sign-up gate. The split is driven entirely by
 * the API's `unlocked_count` — nothing here hardcodes a free-tier size.
 *
 * The locked section is decorative-only: it is `aria-hidden`, non-interactive
 * (`pointer-events-none`, no links), and visually obscured, so it teases the
 * remaining matches without leaking interactive content to assistive tech.
 */

import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card } from '@beerolog/ui'
import { BeerColorGlass } from './BeerColorGlass'
import { deriveBeerColor } from '../lib/beer-color'
import type { GuestRecommendedBeer } from '../lib/guest-answers'

type GuestResultsProps = {
  results: GuestRecommendedBeer[]
  unlockedCount: number
}

export function GuestResults({ results, unlockedCount }: GuestResultsProps) {
  const { t } = useTranslation()
  const visible = results.slice(0, unlockedCount)
  const locked = results.slice(unlockedCount)

  return (
    <div className="flex flex-col gap-6">
      <div data-testid="guest-results-visible" className="flex flex-col gap-3 sm:gap-4">
        {visible.map((beer, index) => (
          <GuestBeerCard key={beer.id} beer={beer} rank={index + 1} />
        ))}
      </div>

      {locked.length > 0 ? (
        <section className="space-y-4">
          <Card className="border-brand-200 bg-gradient-to-br from-brand-50 to-amber-50/80 p-5 text-center shadow-sm sm:p-6">
            <h2 className="text-lg font-bold tracking-tight text-neutral-900">
              {t('try.lockedTitle', { count: locked.length })}
            </h2>
            <p className="mt-1 text-sm text-neutral-600">{t('try.lockedSubtitle')}</p>
            <div className="mt-4 flex justify-center">
              <Link
                to="/signup/$"
                params={{ _splat: '' }}
                search={{ next: '/recommendations' }}
                data-testid="guest-signup-cta"
              >
                <Button size="lg" className="px-8">
                  {t('try.unlockCta')}
                </Button>
              </Link>
            </div>
          </Card>

          <div
            data-testid="guest-results-locked"
            aria-hidden="true"
            className="pointer-events-none flex flex-col gap-3 opacity-50 blur-sm select-none sm:gap-4"
            aria-label={t('try.lockedRegionLabel')}
          >
            {locked.map((beer, index) => (
              <GuestBeerCard key={beer.id} beer={beer} rank={unlockedCount + index + 1} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

type GuestBeerCardProps = {
  beer: GuestRecommendedBeer
  rank: number
}

// A trimmed mirror of RecommendationBeerCard's look, built from the fields the
// public guest endpoint returns (no breakdown/market_tier). Kept local because
// the authed card requires authed-only data it cannot supply.
function GuestBeerCard({ beer, rank }: GuestBeerCardProps) {
  const { t, i18n } = useTranslation()
  const displayName =
    i18n.language.startsWith('he') && beer.name_hebrew ? beer.name_hebrew : beer.name
  const beerColor = deriveBeerColor(beer.style, beer.color)

  return (
    <Card
      data-testid="guest-beer-card"
      className="overflow-hidden border-neutral-200 bg-white shadow-sm"
    >
      <div className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-6">
        <div className="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-600"
            aria-hidden
          >
            {rank}
          </span>
          <Badge
            variant="success"
            className="whitespace-nowrap text-xs font-semibold tabular-nums"
            aria-label={t('try.matchAria', { percent: beer.match_percent })}
          >
            {t('try.matchBadge', { percent: beer.match_percent })}
          </Badge>
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="order-2 min-w-0 space-y-1 sm:order-1 sm:flex-1">
              <h2 className="text-base font-bold leading-snug tracking-tight text-neutral-900 break-words sm:text-lg sm:leading-tight">
                {displayName}
              </h2>
              <p className="text-sm text-neutral-600">{beer.brewery}</p>
            </div>

            <div className="order-1 shrink-0 sm:order-2">
              {beer.image_url ? (
                <img
                  src={beer.image_url}
                  alt=""
                  className="h-20 w-20 rounded-xl object-cover shadow-sm ring-1 ring-neutral-200/80 sm:h-16 sm:w-16 sm:rounded-2xl"
                />
              ) : (
                <BeerColorGlass color={beerColor} className="h-16 w-16 sm:h-14 sm:w-14" />
              )}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5 sm:justify-start sm:gap-2">
            <Badge variant="outline" className="text-xs">
              {beer.style}
            </Badge>
            <Badge variant="default" className="text-xs">
              {t('try.abvBadge', { abv: formatAbv(beer.abv) })}
            </Badge>
          </div>

          {beer.why ? (
            <blockquote className="w-full border-t-4 border-brand-400 bg-brand-50/60 px-3 py-2 text-sm italic leading-relaxed text-neutral-700 sm:border-s-4 sm:border-t-0">
              {beer.why}
            </blockquote>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function formatAbv(abv: number): string {
  return `${Number(abv.toFixed(1))}%`
}
