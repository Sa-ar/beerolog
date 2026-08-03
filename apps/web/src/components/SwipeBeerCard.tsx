/**
 * Shared swipe card (issue #323). Product photo keeps its natural aspect
 * (object-contain) over a blurred cover of the same image that fills letterbox
 * gaps. Name / brewery / pills / why / details sit in a solid footer below —
 * not overlaid on the bottle. Match % and super-like sit on the photo. Deep
 * facts live on /beer/$id. Both decks render it; the deck owns swipe + actions.
 */
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge, Heading } from '@beerolog/ui'
import { BeerColorGlass } from './BeerColorGlass'
import { deriveBeerColor, type BeerColor } from '../lib/beer-color'
import { BEER_COLOR_GLOW } from '../lib/beer-color'
import { displayBeerName } from '../lib/display-beer-name'
import { formatAbv } from '../lib/format-abv'

export type CardBeer = {
  id: string
  name: string
  name_hebrew?: string | null
  brewery: string
  style: string
  abv: number
  image_url?: string | null
  color?: BeerColor | null
}

export function SwipeBeerCard({
  beer,
  matchPercent = null,
  why = null,
  superLiked = false,
}: {
  beer: CardBeer
  matchPercent?: number | null
  why?: string | null
  superLiked?: boolean
}) {
  const { t, i18n } = useTranslation()
  const displayName = displayBeerName(beer, i18n.language)
  const color = deriveBeerColor(beer.style, beer.color ?? undefined)

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-neutral-50 text-neutral-900 shadow-xl ring-1 ring-black/10">
      {/* Photo zone: sharp product at natural aspect; blurred cover fills the gaps. */}
      <div className="relative min-h-0 flex-1 overflow-hidden bg-neutral-50">
        {beer.image_url ? (
          <>
            <img
              src={beer.image_url}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover blur-md"
            />
            <div className="pointer-events-none absolute inset-0 bg-black/20" aria-hidden />
            {/* Contain fills width or height (touches at least one pair of edges), no stretch. */}
            <img
              src={beer.image_url}
              alt=""
              className="absolute inset-0 z-[1] h-full w-full object-contain"
            />
          </>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ backgroundColor: BEER_COLOR_GLOW[color] }}
            data-testid="card-swatch"
          >
            <BeerColorGlass color={color} className="h-44 w-44" />
          </div>
        )}

        {matchPercent != null ? (
          <div className="absolute start-3 top-3 z-10">
            <Badge
              variant="success"
              className="tabular-nums text-xs font-semibold shadow"
              aria-label={t('recommendations.matchAria', { percent: matchPercent })}
            >
              {t('recommendations.matchBadge', { percent: matchPercent })}
            </Badge>
          </div>
        ) : null}

        {superLiked ? (
          <div
            className="absolute end-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-lg shadow"
            aria-label={t('whatIWant.superLike')}
          >
            <span aria-hidden>★</span>
          </div>
        ) : null}
      </div>

      {/* Cream text on real black — not remapped bg-white / text-white. Keep compact so the photo zone stays tall. */}
      <div className="flex shrink-0 flex-col gap-1 bg-black px-3.5 py-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <Heading level={2} className="min-w-0 flex-1 truncate text-lg font-semibold leading-tight text-neutral-900">
            {displayName}
          </Heading>
          <Link
            to="/beer/$id"
            params={{ id: beer.id }}
            className="shrink-0 text-sm font-semibold text-brand-300 underline-offset-2 hover:underline"
          >
            {t('whatIWant.details')}
          </Link>
        </div>
        <p className="truncate text-sm text-neutral-600">{beer.brewery}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="border-neutral-500 text-xs text-neutral-900">
            {beer.style}
          </Badge>
          <Badge variant="outline" className="border-neutral-500 text-xs text-neutral-900">
            {t('recommendations.abvBadge', { abv: formatAbv(beer.abv) })}
          </Badge>
        </div>
        {why ? (
          <p className="line-clamp-2 text-sm italic leading-snug text-neutral-800">{why}</p>
        ) : null}
      </div>
    </div>
  )
}
