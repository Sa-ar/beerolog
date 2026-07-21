import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Dialog, DialogContent, DialogTitle } from '@beerolog/ui'
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
    return <EnlargeableImage src={imageUrl} />
  }
  return (
    <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-neutral-50 ring-1 ring-neutral-200/80 sm:h-full sm:w-full sm:rounded-none sm:ring-0">
      <BeerColorGlass color={color} className="h-16 w-16" />
    </div>
  )
}

// Tap the photo to open it full-size. Shared Dialog handles Esc + focus trap;
// backdrop click or tapping the enlarged image dismisses it.
function EnlargeableImage({ src }: { src: string }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const titleId = useId()
  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={t('common.enlargeImage')}
        className="h-28 w-28 cursor-zoom-in p-0 hover:bg-transparent sm:h-full sm:w-full"
      >
        <img
          src={src}
          alt=""
          className="h-full w-full rounded-xl object-cover shadow-sm ring-1 ring-neutral-200/80 sm:rounded-none sm:shadow-none sm:ring-0"
        />
      </Button>
      <Dialog open={open} dismissible onOpenChange={setOpen}>
        <DialogContent
          className="max-h-[92vh] max-w-[92vw] border-0 bg-transparent p-0 shadow-none"
          aria-labelledby={titleId}
        >
          <DialogTitle id={titleId} className="sr-only">
            {t('common.enlargeImage')}
          </DialogTitle>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            aria-label={t('common.close')}
            className="h-auto w-auto cursor-zoom-out p-0 hover:bg-transparent"
          >
            <img
              src={src}
              alt=""
              className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain"
            />
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
