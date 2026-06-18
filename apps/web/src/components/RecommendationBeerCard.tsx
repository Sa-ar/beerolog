import { Badge, Card } from '@beerolog/ui'
import { BeerColorGlass } from './BeerColorGlass'
import { deriveBeerColor, type BeerColor } from '../lib/beer-color'
import { matchAlignmentPercents, type MatchCalibration } from '../lib/match-score'
import type { AbvIntent } from '../lib/session-intent'

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
  brewery: string
  style: string
  abv: number
  market_tier: 'mainstream' | 'craft' | 'import'
  color?: BeerColor | null
  image_url: string | null
  why_line: string
  breakdown: Breakdown
}

type RecommendationBeerCardProps = {
  beer: RecommendedBeer
  rank: number
  matchPercent: number
  alpha: number
  hasSession: boolean
  abvIntent?: AbvIntent | undefined
  calibration?: MatchCalibration
}

const TIER_LABELS: Record<RecommendedBeer['market_tier'], string> = {
  mainstream: 'Mainstream',
  craft: 'Craft',
  import: 'Import',
}

export function RecommendationBeerCard({
  beer,
  rank,
  matchPercent,
  alpha,
  hasSession,
  abvIntent,
  calibration,
}: RecommendationBeerCardProps) {
  const isTopPick = rank === 1
  const beerColor = deriveBeerColor(beer.style, beer.color)
  const contributors = matchAlignmentPercents(
    beer.breakdown,
    alpha,
    hasSession,
    abvIntent,
    calibration,
  )

  return (
    <Card
      className={[
        'overflow-hidden transition-shadow',
        isTopPick
          ? 'border-brand-300 bg-gradient-to-br from-brand-50 via-white to-amber-50/80 shadow-md'
          : 'border-neutral-200 bg-white shadow-sm',
      ].join(' ')}
    >
      <div className="flex flex-col items-center gap-4 p-4 sm:flex-row sm:items-start sm:gap-4 sm:p-6">
        <div className="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start">
          <span
            className={[
              'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold',
              isTopPick
                ? 'bg-brand-500 text-white shadow-sm'
                : 'bg-neutral-100 text-neutral-600',
            ].join(' ')}
            aria-hidden
          >
            {rank}
          </span>
          <Badge
            variant="success"
            className="whitespace-nowrap text-xs font-semibold tabular-nums"
            aria-label={`${matchPercent} percent match`}
          >
            {matchPercent}% match
          </Badge>
        </div>

        <div className="flex w-full min-w-0 flex-1 flex-col items-center gap-3 text-center sm:items-start sm:text-left">
          <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-start sm:gap-4">
            <div className="order-2 min-w-0 space-y-1 sm:order-1 sm:flex-1">
              {isTopPick ? (
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                  Top pick
                </p>
              ) : null}
              <h2 className="text-base font-bold leading-snug tracking-tight text-neutral-900 break-words sm:text-lg sm:leading-tight sm:text-xl">
                {beer.name}
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
              {formatAbv(beer.abv)} ABV
            </Badge>
            <Badge variant={tierBadgeVariant(beer.market_tier)} className="text-xs">
              {TIER_LABELS[beer.market_tier]}
            </Badge>
          </div>

          <div className="w-full space-y-2">
            {beer.why_line ? (
              <blockquote className="border-t-4 border-brand-400 bg-brand-50/60 px-3 py-2 text-sm italic leading-relaxed text-neutral-700 sm:border-l-4 sm:border-t-0">
                {beer.why_line}
              </blockquote>
            ) : null}

            <details className="w-full rounded-lg border border-neutral-200 bg-neutral-50/80 px-3 py-2 text-left text-xs text-neutral-600">
              <summary className="cursor-pointer font-medium text-neutral-700">
                How we matched this beer
              </summary>
              <ul className="mt-2 space-y-1 pl-4">
                {contributors.map((item) => (
                  <li key={item.label}>
                    {item.label}:{' '}
                    <span className="font-semibold tabular-nums text-neutral-800">
                      {item.percent}%
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </div>
    </Card>
  )
}

function formatAbv(abv: number): string {
  return `${Number(abv.toFixed(1))}%`
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
