/**
 * Shared image-forward swipe card (issue #323). Full-bleed hero photo (or a
 * designed color-swatch fallback), with overlays: match % (top-start),
 * super-like marker (top-end), name + brewery, up to two pills (style + ABV),
 * and one why-line in the scrim. Deep facts live on the /beer/$id tap-through,
 * not here. No in-card scroll. Both decks (`What I want`, `What I know`) render
 * it; the deck owns the swipe gesture + action buttons.
 */
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Badge, Heading } from '@beerolog/ui'
import { BeerColorGlass } from './BeerColorGlass'
import { deriveBeerColor, type BeerColor } from '../lib/beer-color'
import { BEER_COLOR_GLOW } from '../lib/beer-color'

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
  const displayName =
    i18n.language.startsWith('he') && beer.name_hebrew ? beer.name_hebrew : beer.name
  const color = deriveBeerColor(beer.style, beer.color ?? undefined)

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl bg-neutral-900 text-white shadow-xl ring-1 ring-black/10">
      {/* Hero: photo fills the card; designed swatch fallback when imageless. */}
      {beer.image_url ? (
        <img src={beer.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: BEER_COLOR_GLOW[color] }}
          data-testid="card-swatch"
        >
          <BeerColorGlass color={color} className="h-44 w-44" />
        </div>
      )}

      {/* Bottom scrim for legibility over the photo. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/45 to-transparent" />

      {matchPercent != null ? (
        <div className="absolute start-3 top-3">
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
          className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-lg shadow"
          aria-label={t('whatIWant.superLike')}
        >
          <span aria-hidden>★</span>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
        <Heading level={2} className="text-2xl font-semibold leading-tight text-white">
          {displayName}
        </Heading>
        <p className="text-sm text-white/80">{beer.brewery}</p>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-white/40 text-xs text-white">
            {beer.style}
          </Badge>
          <Badge variant="outline" className="border-white/40 text-xs text-white">
            {t('recommendations.abvBadge', { abv: `${Number(beer.abv.toFixed(1))}%` })}
          </Badge>
        </div>
        {why ? <p className="text-sm italic leading-relaxed text-white/90">{why}</p> : null}
        <Link
          to="/beer/$id"
          params={{ id: beer.id }}
          className="mt-1 inline-block text-sm font-semibold text-brand-200 underline-offset-2 hover:underline"
        >
          {t('whatIWant.details')}
        </Link>
      </div>
    </div>
  )
}
