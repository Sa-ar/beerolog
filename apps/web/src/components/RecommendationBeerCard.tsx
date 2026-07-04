import type { TFunction } from 'i18next'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Rating } from '@beerolog/types'
import { Badge, Card, RatingTapper } from '@beerolog/ui'
import { apiClient } from '../lib/api-client/client'
import { BeerColorGlass } from './BeerColorGlass'
import { deriveBeerColor, type BeerColor } from '../lib/beer-color'
import { matchAlignmentPercents, type MatchCalibration } from '../lib/match-score'
import { SAVE_STATUS, type SaveStatus } from '../lib/save-status'
import type { AbvIntent } from '../lib/session-intent'
import { beerStoreSearchUrl } from '../lib/beer-store-search'

type Breakdown = {
  baseline_cos?: number
  session_cos?: number
  baseline_score: number
  session_score: number
  abv_score: number
  abv_fits_intent?: boolean | null
  novelty_score: number
  total_score: number
  dominant_component: 'baseline' | 'session' | 'abv' | 'novelty_positive' | 'novelty_negative'
}

export type RecommendedBeer = {
  id: string
  name: string
  name_hebrew?: string | null
  brewery: string
  style: string
  abv: number
  market_tier: 'mainstream' | 'craft' | 'import'
  color?: BeerColor | null
  image_url: string | null
  why: WhyLine
  breakdown: Breakdown
}

export type WhyLine = {
  code: string
  params?: Record<string, string>
}

type RecommendationBeerCardProps = {
  beer: RecommendedBeer
  rank: number
  matchPercent: number
  alpha: number
  hasSession: boolean
  abvIntent?: AbvIntent | undefined
  calibration?: MatchCalibration
  searchArea?: string
}

export function RecommendationBeerCard({
  beer,
  rank,
  matchPercent,
  alpha,
  hasSession,
  abvIntent,
  calibration,
  searchArea = '',
}: RecommendationBeerCardProps) {
  const { t, i18n } = useTranslation()
  const isTopPick = rank === 1
  // Catalog names are bilingual; show Hebrew when the UI is Hebrew, fall back to English.
  const displayName =
    i18n.language.startsWith('he') && beer.name_hebrew ? beer.name_hebrew : beer.name
  const beerColor = deriveBeerColor(beer.style, beer.color)
  const contributors = matchAlignmentPercents(
    beer.breakdown,
    alpha,
    hasSession,
    abvIntent,
    calibration,
  )
  // Immediate (card) rating path. Optimistic: show 'saving' at once, then the
  // saved confirmation; on error keep the tapper so the user can retry.
  const [rateStatus, setRateStatus] = useState<SaveStatus>(SAVE_STATUS.idle)

  async function handleRate(rating: Rating) {
    setRateStatus(SAVE_STATUS.saving)
    const { error } = await apiClient.POST('/ratings', {
      body: { beer_id: beer.id, rating },
    })
    setRateStatus(error ? SAVE_STATUS.error : SAVE_STATUS.saved)
  }

  return (
    <Card
      className={[
        'overflow-hidden transition-shadow',
        isTopPick
          ? 'border border-brand-700/50 bg-[hsl(25_24%_7%)] shadow-md'
          : 'border-neutral-200 bg-white shadow-sm',
      ].join(' ')}
    >
      <div className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-6">
        <div className="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start">
          <span
            className={[
              'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
              isTopPick
                ? 'bg-brand-500 text-[hsl(26_30%_10%)] shadow-sm'
                : 'bg-neutral-100 text-neutral-600',
            ].join(' ')}
            aria-hidden
          >
            {rank}
          </span>
          <Badge
            variant="success"
            className="whitespace-nowrap text-xs font-semibold tabular-nums"
            aria-label={t('recommendations.matchAria', { percent: matchPercent })}
          >
            {t('recommendations.matchBadge', { percent: matchPercent })}
          </Badge>
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-start">
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="order-2 min-w-0 space-y-1 sm:order-1 sm:flex-1">
              {isTopPick ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  {t('recommendations.topPick')}
                </p>
              ) : null}
              <h2 className="text-base font-bold leading-snug tracking-tight text-neutral-900 break-words sm:text-lg sm:leading-tight sm:text-xl">
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
              {t('recommendations.abvBadge', { abv: formatAbv(beer.abv) })}
            </Badge>
            <Badge variant={tierBadgeVariant(beer.market_tier)} className="text-xs">
              {t(`recommendations.tier.${beer.market_tier}`)}
            </Badge>
          </div>

          <div className="w-full space-y-2">
            {beer.why?.code ? (
              <blockquote className="border-t-4 border-brand-400 bg-brand-50/60 px-3 py-2 text-sm italic leading-relaxed text-neutral-700 sm:border-s-4 sm:border-t-0">
                {whyText(t, beer.why)}
              </blockquote>
            ) : null}

            <details className="w-full rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-2 text-start text-xs text-neutral-600">
              <summary className="cursor-pointer font-medium text-neutral-700">
                {t('recommendations.howMatched')}
              </summary>
              <ul className="mt-2 space-y-1 ps-4">
                {contributors.map((item) => (
                  <li key={item.key}>
                    {t(`recommendations.contributors.${item.key}`)}:{' '}
                    <span className="font-semibold tabular-nums text-neutral-800">
                      {item.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </div>

          <div className="flex w-full flex-col gap-1.5">
            <p className="text-xs font-medium text-neutral-500">
              {t('recommendations.findNearby.title')}
            </p>
            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
              {(['shop', 'pub'] as const).map((venue) => {
                const venueTerm = t(`recommendations.findNearby.${venue}`)
                return (
                  <a
                    key={venue}
                    href={beerStoreSearchUrl(beer.name, venueTerm, searchArea)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-brand-400 hover:bg-brand-50"
                  >
                    <span aria-hidden>{venue === 'shop' ? '🛒' : '🍺'}</span>
                    {venueTerm}
                  </a>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-200 px-4 py-3 sm:px-6">
        <p className="mb-2 text-xs font-medium text-neutral-600">
          {t('recommendations.ratePrompt', 'Had this one? Rate it')}
        </p>
        {rateStatus === SAVE_STATUS.saved ? (
          <p role="status" className="text-sm text-neutral-700">
            {t('recommendations.rateSaved', 'Thanks — saved your rating')}
          </p>
        ) : (
          <RatingTapper
            onRate={handleRate}
            disabled={rateStatus === SAVE_STATUS.saving}
            labels={{
              loved: t('rate.tapper.loved', 'Loved it'),
              fine: t('rate.tapper.fine', 'It was fine'),
              disliked: t('rate.tapper.disliked', 'Not for me'),
            }}
          />
        )}
        {rateStatus === SAVE_STATUS.error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {t('recommendations.rateError', "Couldn't save — tap to retry")}
          </p>
        )}
      </div>
    </Card>
  )
}

function formatAbv(abv: number): string {
  return `${Number(abv.toFixed(1))}%`
}

// Renders the API's language-neutral why-line. Vibe/ABV params are themselves
// translated (why.vibe.*, why.abv.*) so the sentence reads naturally per language.
function whyText(t: TFunction, why: WhyLine): string {
  const params: Record<string, string> = {}
  if (why.params?.vibe) params.vibe = t(`why.vibeWord.${why.params.vibe}`)
  if (why.params?.abv) params.abv = t(`why.abvWord.${why.params.abv}`)
  return t(`why.${why.code}`, params)
}

function tierBadgeVariant(
  tier: RecommendedBeer['market_tier'],
): 'default' | 'outline' | 'success' {
  switch (tier) {
    case 'craft':
      return 'default'
    case 'import':
      return 'success'
    case 'mainstream':
      return 'outline'
    default: {
      const _exhaustive: never = tier
      return _exhaustive
    }
  }
}
