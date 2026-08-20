import type { TFunction } from 'i18next'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Rating } from '@beerolog/types'
import { Badge, Button, Card, Dialog, DialogContent, DialogTitle, Heading, RatingTapper } from '@beerolog/ui'
import { CatalogIcon } from '@beerolog/icons'
import { apiClient } from '../lib/api-client/client'
import { displayBeerName } from '../lib/display-beer-name'
import { BeerCardMedia } from './BeerCardMedia'
import { BeerDetail } from './BeerDetail'
import { deriveBeerColor, type BeerColor } from '../lib/beer-color'
import { formatAbv } from '../lib/format-abv'
import { useMyRatings } from '../lib/my-ratings'
import { SAVE_STATUS, type SaveStatus } from '../lib/save-status'

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
  ibu?: number | null
  adventurousness: number
  why: WhyLine
  breakdown: Breakdown
}

export type WhyFact = {
  code: string
  params?: Record<string, string>
}

export type WhyLine = {
  code: string
  params?: Record<string, string>
  /** LLM sentence already in the request locale; prefer over template code. */
  text?: string | null
  facts?: WhyFact[]
}

type RecommendationBeerCardProps = {
  beer: RecommendedBeer
  rank: number
  matchPercent: number
  /** The viewer's BaselineTaste dials, overlaid on the detail radar. */
  taste?: { bitterness: number; abv_affinity?: number | null; novelty_affinity: number } | null
  /** Opt-in URL-addressable detail modal (#276). When provided, the caller drives
   *  open/close (e.g. a ?beer= search param) instead of the card's local state. */
  detail?: { open: boolean; onOpenChange: (open: boolean) => void }
}

export function RecommendationBeerCard({
  beer,
  rank,
  matchPercent,
  taste,
  detail,
}: RecommendationBeerCardProps) {
  const { t, i18n } = useTranslation()
  const isTopPick = rank === 1
  // Catalog names are bilingual; show Hebrew when the UI is Hebrew, fall back to English.
  const displayName = displayBeerName(beer, i18n.language)
  const beerColor = deriveBeerColor(beer.style, beer.color)
  // Immediate (card) rating path. Optimistic: show 'saving' at once, then the
  // saved confirmation; on error keep the tapper so the user can retry.
  const [rateStatus, setRateStatus] = useState<SaveStatus>(SAVE_STATUS.idle)
  const myRatings = useMyRatings()
  // Detail modal: local state by default; when `detail` is provided the caller
  // drives open/close (e.g. a ?beer= search param, #276).
  const [localDetailOpen, setLocalDetailOpen] = useState(false)
  const detailOpen = detail ? detail.open : localDetailOpen
  const setDetailOpen = detail ? detail.onOpenChange : setLocalDetailOpen

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
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <div className="order-1 flex shrink-0 flex-col items-center gap-2 self-center px-4 pt-4 sm:self-start sm:p-6 sm:pe-0">
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

        <BeerCardMedia imageUrl={beer.image_url} color={beerColor} />

        <div className="order-3 flex w-full min-w-0 flex-1 flex-col items-center gap-3 p-4 text-center sm:order-2 sm:items-start sm:p-6 sm:ps-4 sm:text-start">
          <div className="min-w-0 space-y-1">
            {isTopPick ? (
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                {t('recommendations.topPick')}
              </p>
            ) : null}
            <Heading level={2} className="text-base leading-snug break-words sm:text-lg sm:leading-tight sm:text-xl">
              {displayName}
            </Heading>
            <p className="text-sm text-neutral-600">{beer.brewery}</p>
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

          <div className="w-full">
            <WhyExplanation t={t} why={beer.why} beerName={displayName} brewery={beer.brewery} />
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setDetailOpen(true)}
            className="h-auto gap-1 p-0 text-sm font-semibold text-brand-600 underline-offset-2 hover:bg-transparent hover:underline"
          >
            {t('beerDetail.openCta')}
          </Button>

        </div>
      </div>
      <div className="border-t border-neutral-200 px-4 py-3 sm:px-6">
        <p className="mb-2 text-xs font-medium text-neutral-600">
          {t('recommendations.ratePrompt')}
        </p>
        {rateStatus === SAVE_STATUS.saved ? (
          <div className="space-y-2">
            <p role="status" className="text-sm text-neutral-700">
              {t('recommendations.rateSaved')}
            </p>
            <Link
              to="/rate"
              className="text-sm font-semibold text-brand-600 underline-offset-2 hover:underline"
            >
              {t('recommendations.rateDeckCta')}
            </Link>
          </div>
        ) : (
          <RatingTapper
            onRate={handleRate}
            selected={myRatings[beer.id]}
            disabled={rateStatus === SAVE_STATUS.saving}
            labels={{
              loved: t('rate.tapper.loved'),
              fine: t('rate.tapper.fine'),
              disliked: t('rate.tapper.disliked'),
            }}
          />
        )}
        {rateStatus === SAVE_STATUS.error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {t('recommendations.rateError')}
          </p>
        )}
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen} dismissible>
        <DialogContent>
          <DialogTitle className="sr-only">{displayName}</DialogTitle>
          <div className="mb-2 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setDetailOpen(false)}
              aria-label={t('common.close')}
              className="h-8 w-8 rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            >
              <CatalogIcon group="action" iconKey="close" className="h-4 w-4" />
            </Button>
          </div>
          <BeerDetail
            beer={{
              name: beer.name,
              name_hebrew: beer.name_hebrew ?? null,
              brewery: beer.brewery,
              style: beer.style,
              abv: beer.abv,
              market_tier: beer.market_tier,
              color: beer.color ?? null,
              image_url: beer.image_url,
              ibu: beer.ibu ?? null,
              adventurousness: beer.adventurousness,
              matchPercent,
              why: whyText(t, beer.why, displayName, beer.brewery) || null,
              taste: taste ?? null,
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// Prefer the LLM one-liner (unique per beer). If the model fails, still make the
// fallback unique by naming this beer — shared template codes alone look identical.
function WhyExplanation({
  t,
  why,
  beerName,
  brewery,
}: {
  t: TFunction
  why: WhyLine
  beerName: string
  brewery: string
}) {
  const line = whyText(t, why, beerName, brewery)
  if (!line) return null
  return (
    <blockquote className="border-t-4 border-brand-400 bg-brand-50/60 px-3 py-2 text-sm italic leading-relaxed text-neutral-700 sm:border-s-4 sm:border-t-0">
      {line}
    </blockquote>
  )
}

function whyText(
  t: TFunction,
  why: WhyLine,
  beerName: string,
  brewery: string,
): string {
  if (why.text?.trim()) return why.text.trim()
  if (!why.code) return ''
  const params: Record<string, string> = {}
  if (why.params?.vibe) params.vibe = t(`why.vibeWord.${why.params.vibe}`)
  if (why.params?.abv) params.abv = t(`why.abvWord.${why.params.abv}`)
  if (why.params?.flavor) params.flavor = t(`why.flavorWord.${why.params.flavor}`)
  if (why.params?.style) params.style = why.params.style
  const reason = t(`why.${why.code}`, params)
  return t('why.namedFallback', { name: beerName, brewery, reason })
}

function tierBadgeVariant(tier: RecommendedBeer['market_tier']): 'default' | 'outline' | 'success' {
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
