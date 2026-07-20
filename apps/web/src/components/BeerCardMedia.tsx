import { BeerColorGlass } from './BeerColorGlass'
import type { BeerColor } from '../lib/beer-color'

/**
 * Beer photo (or color-glass / skeleton fallback) for recommendation cards.
 * Mobile: centered square above the title. Desktop: full-height trailing edge strip.
 */
export function BeerCardMedia({
  imageUrl = null,
  color,
  skeleton = false,
}: {
  imageUrl?: string | null
  color?: BeerColor
  skeleton?: boolean
}) {
  return (
    <div className="order-2 flex shrink-0 justify-center px-4 pt-4 sm:order-3 sm:w-32 sm:self-stretch sm:p-0">
      <BeerCardMediaInner imageUrl={imageUrl} color={color ?? 'gold'} skeleton={skeleton} />
    </div>
  )
}

function BeerCardMediaInner({
  imageUrl,
  color,
  skeleton,
}: {
  imageUrl: string | null
  color: BeerColor
  skeleton: boolean
}) {
  if (skeleton) {
    return <div className="h-28 w-28 rounded-xl bg-neutral-200 sm:h-full sm:w-full sm:rounded-none" />
  }
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-28 w-28 rounded-xl object-cover shadow-sm ring-1 ring-neutral-200/80 sm:h-full sm:w-full sm:rounded-none sm:shadow-none sm:ring-0"
      />
    )
  }
  return (
    <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-neutral-50 ring-1 ring-neutral-200/80 sm:h-full sm:w-full sm:rounded-none sm:ring-0">
      <BeerColorGlass color={color} className="h-16 w-16" />
    </div>
  )
}
