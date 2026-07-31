import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Heading } from '@beerolog/ui'
import { TasteRadar } from './TasteRadar'
import { BeerColorGlass } from './BeerColorGlass'
import { beerSensoryAxes, tasteOverlayAxes } from '../lib/beer-radar'
import { deriveBeerColor, type BeerColor } from '../lib/beer-color'

export type BeerDetailData = {
  name: string
  name_hebrew?: string | null
  brewery: string
  style: string
  abv: number
  market_tier: 'mainstream' | 'craft' | 'import'
  color?: BeerColor | null
  image_url?: string | null
  ibu?: number | null
  adventurousness: number
  body?: 'light' | 'medium' | 'full' | null
  sweetness?: 'dry' | 'balanced' | 'sweet' | null
  /** Already-resolved why-this-beer sentence in the request locale. */
  why?: string | null
  /** User-facing match % when known (profile / session). */
  matchPercent?: number | null
  /** The viewer's BaselineTaste dials, overlaid on the radar. null = objective-only. */
  taste?: { bitterness: number; abv_affinity?: number | null; novelty_affinity: number } | null
}

/**
 * Presentational per-beer detail: hero image, match %, facts, sensory radar,
 * color swatch, body/sweetness chips, and why line. Pure — never fetches.
 */
export function BeerDetail({
  beer,
  footer,
}: {
  beer: BeerDetailData
  /** Optional slot under the detail (rating tapper, catch control, etc.). */
  footer?: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const displayName =
    i18n.language.startsWith('he') && beer.name_hebrew ? beer.name_hebrew : beer.name
  const beerColor = deriveBeerColor(beer.style, beer.color)
  const axes = beerSensoryAxes({
    ibu: beer.ibu ?? null,
    abv: beer.abv,
    adventurousness: beer.adventurousness,
  })
  const axisLabels: Record<string, string> = {
    bitterness: t('beerDetail.axis.bitterness'),
    strength: t('beerDetail.axis.strength'),
    adventurousness: t('beerDetail.axis.adventurousness'),
  }
  // Align the overlay to the beer's present axes (e.g. drop bitterness when the
  // beer has no ibu) so the two polygons share the same spokes.
  const overlayAxes = beer.taste
    ? tasteOverlayAxes(beer.taste).filter((o) => axes.some((a) => a.key === o.key))
    : undefined

  return (
    <div data-testid="beer-detail" className="flex flex-col gap-4">
      <div className="relative mx-auto w-full max-w-sm overflow-hidden rounded-2xl bg-neutral-100 ring-1 ring-neutral-200/80">
        <div className="relative aspect-[4/5] w-full">
          {beer.image_url ? (
            <img
              src={beer.image_url}
              alt={displayName}
              className="h-full w-full object-contain p-4"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-50">
              <BeerColorGlass color={beerColor} className="h-28 w-28" />
            </div>
          )}
          {beer.matchPercent != null ? (
            <Badge
              variant="success"
              className="absolute start-3 top-3 whitespace-nowrap text-xs font-semibold tabular-nums shadow-sm"
              aria-label={t('recommendations.matchAria', { percent: beer.matchPercent })}
            >
              {t('recommendations.matchBadge', { percent: beer.matchPercent })}
            </Badge>
          ) : null}
        </div>
      </div>

      <header className="space-y-1 text-center">
        <Heading level={2} className="text-xl leading-snug sm:text-2xl">
          {displayName}
        </Heading>
        <p className="text-sm text-neutral-600">{beer.brewery}</p>
        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
          <Badge variant="outline" className="text-xs">
            {beer.style}
          </Badge>
          <Badge variant="default" className="text-xs">
            {formatAbv(beer.abv)}
          </Badge>
          {beer.ibu != null ? (
            <Badge variant="outline" className="text-xs">
              {t('beerDetail.ibuBadge', { ibu: beer.ibu })}
            </Badge>
          ) : null}
          <Badge variant="outline" className="text-xs">
            {t(`recommendations.tier.${beer.market_tier}`)}
          </Badge>
        </div>
      </header>

      <TasteRadar
        axes={axes}
        labels={axisLabels}
        ariaLabel={t('beerDetail.radarAria', { name: displayName })}
        overlay={overlayAxes}
        seriesLabels={
          overlayAxes
            ? { primary: t('beerDetail.legend.beer'), overlay: t('beerDetail.legend.you') }
            : undefined
        }
      />

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5" aria-label={t('beerDetail.colorLabel')}>
          <BeerColorGlass color={beerColor} className="h-5 w-5" />
          <span className="text-xs text-neutral-500">{t('beerDetail.colorLabel')}</span>
        </span>
        {beer.body ? (
          <Badge variant="outline" className="text-xs">
            {t(`beerDetail.body.${beer.body}`)}
          </Badge>
        ) : null}
        {beer.sweetness ? (
          <Badge variant="outline" className="text-xs">
            {t(`beerDetail.sweetness.${beer.sweetness}`)}
          </Badge>
        ) : null}
      </div>

      {beer.why ? (
        <blockquote className="border-s-4 border-brand-400 bg-brand-50/60 px-3 py-2 text-sm italic leading-relaxed text-neutral-700">
          {beer.why}
        </blockquote>
      ) : null}

      {footer ? <div className="mt-2">{footer}</div> : null}
    </div>
  )
}

function formatAbv(abv: number): string {
  return `${Number(abv.toFixed(1))}%`
}
