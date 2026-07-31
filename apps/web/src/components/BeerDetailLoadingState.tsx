import { useTranslation } from 'react-i18next'
import { PAGE_MAIN } from '@beerolog/shared'

/** Skeleton matching BeerDetail layout — shown while /beer/$id loads. */
export function BeerDetailLoadingState() {
  const { t } = useTranslation()
  return (
    <main
      className={`${PAGE_MAIN} py-8 sm:py-10`}
      aria-busy="true"
      aria-label={t('beerDetail.route.loading')}
      data-testid="beer-loading"
    >
      <div className="mx-auto flex max-w-md animate-pulse flex-col gap-4">
        <div className="mx-auto aspect-[4/5] w-full max-w-sm rounded-2xl bg-neutral-200" />
        <header className="space-y-2 text-center">
          <div className="mx-auto h-7 w-48 rounded bg-neutral-200" />
          <div className="mx-auto h-4 w-32 rounded bg-neutral-100" />
          <div className="flex flex-wrap justify-center gap-1.5 pt-1">
            <div className="h-6 w-20 rounded-full bg-neutral-100" />
            <div className="h-6 w-12 rounded-full bg-neutral-100" />
            <div className="h-6 w-16 rounded-full bg-neutral-100" />
          </div>
        </header>
        <div className="mx-auto aspect-square w-full max-w-[16rem] rounded-full bg-neutral-100" />
        <p className="text-center text-sm text-neutral-400">{t('beerDetail.route.loading')}</p>
      </div>
    </main>
  )
}
