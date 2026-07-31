/**
 * /beer/$id — public, shareable per-beer page. Renders BeerDetail from
 * GET /catalog/{id}. Signed-in: taste overlay, match %, rating tapper, catch.
 * Signed-out: objective view + quiz CTA.
 */
import { Show, useAuth } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Rating } from '@beerolog/types'
import { Button, Heading, RatingTapper } from '@beerolog/ui'
import { getAuthToken, PAGE_MAIN } from '@beerolog/shared'
import {
  catalogBeerQueryKey,
  fetchCatalogBeer,
  loadCatalogBeer,
  type CatalogBeer,
} from '../lib/catalog-beer'
import { useBeerMatchPercent } from '../lib/beer-match'
import { loadBaselineTaste, type LoadBaselineResult } from '../lib/load-baseline-taste'
import { useMyRatings } from '../lib/my-ratings'
import { useRateOne } from '../lib/rate-search'
import { BeerDetail, type BeerDetailData } from '../components/BeerDetail'
import { BeerDetailLoadingState } from '../components/BeerDetailLoadingState'
import { CatchBeerControl } from '../components/CatchBeerControl'
import type { BeerColor } from '../lib/beer-color'
import { capture } from '../lib/analytics'

const SITE_URL = (import.meta.env.VITE_WEB_URL as string | undefined) ?? 'https://beerolog.com'

export type BeerOgData = Pick<
  CatalogBeer,
  'id' | 'name' | 'brewery' | 'style' | 'abv' | 'image_url'
>

export function beerHead({ loaderData }: { loaderData?: { beer: BeerOgData | null } | undefined }) {
  const b = loaderData?.beer
  if (!b) return {}
  const title = `${b.name} · Beerolog`
  const description = `${b.brewery} · ${b.style} · ${b.abv}% ABV`
  const image = b.image_url ?? null
  const meta: Array<Record<string, string>> = [
    { title },
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: `${SITE_URL}/beer/${b.id}` },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    { name: 'twitter:card', content: image ? 'summary_large_image' : 'summary' },
  ]
  if (image) {
    meta.push({ property: 'og:image', content: image })
    meta.push({ name: 'twitter:image', content: image })
  }
  return { meta }
}

export const Route = createFileRoute('/beer/$id')({
  loader: async ({ params }): Promise<{ beer: CatalogBeer | null }> => ({
    beer: await loadCatalogBeer(params.id),
  }),
  pendingComponent: BeerDetailLoadingState,
  pendingMs: 0,
  head: beerHead,
  component: BeerDetailPage,
})

export function ownerOverlayTaste(
  result?: LoadBaselineResult,
): { bitterness: number; abv_affinity?: number | null; novelty_affinity: number } | null {
  if (result?.status !== 'ready') return null
  const b = result.baseline
  return {
    bitterness: b.bitterness,
    abv_affinity: b.abv_affinity ?? null,
    novelty_affinity: b.novelty_affinity,
  }
}

function BeerDetailPage() {
  const { id } = Route.useParams()
  const { beer } = Route.useLoaderData()
  return <BeerDetailView id={id} initialBeer={beer} />
}

export function BeerDetailView({
  id,
  initialBeer,
}: {
  id: string
  initialBeer?: CatalogBeer | null
}) {
  const { t } = useTranslation()
  const { isSignedIn } = useAuth()
  let queryOptions: { initialData?: CatalogBeer; staleTime?: number; enabled?: false }
  if (initialBeer != null) {
    queryOptions = { initialData: initialBeer, staleTime: 60_000 }
  } else if (initialBeer === null) {
    queryOptions = { enabled: false }
  } else {
    queryOptions = { staleTime: 60_000 }
  }
  const query = useQuery({
    queryKey: catalogBeerQueryKey(id),
    retry: false,
    queryFn: () => fetchCatalogBeer(id),
    ...queryOptions,
  })

  const overlayQuery = useQuery({
    queryKey: ['beer-overlay-baseline'],
    retry: false,
    queryFn: () => loadBaselineTaste(getAuthToken),
    staleTime: 5 * 60_000,
    enabled: !!isSignedIn,
  })

  const matchQuery = useBeerMatchPercent(id, !!isSignedIn && !!query.data)
  const myRatings = useMyRatings()
  const rateOne = useRateOne()
  const [localRating, setLocalRating] = useState<Rating | null>(null)

  useEffect(() => {
    if (!query.data) return
    capture('beer_detail_viewed', { beer_id: query.data.id, market_tier: query.data.market_tier })
  }, [query.data?.id, query.data?.market_tier])

  if (initialBeer === null || query.isError || (!query.isPending && !query.data)) {
    return (
      <main className={`${PAGE_MAIN} py-10`}>
        <section className="space-y-4 text-center">
          <Heading className="text-2xl">{t('beerDetail.route.notFoundTitle')}</Heading>
          <Link to="/try">
            <Button size="lg">{t('beerDetail.route.cta')}</Button>
          </Link>
        </section>
      </main>
    )
  }

  if (query.isPending || !query.data) {
    return <BeerDetailLoadingState />
  }

  const b = query.data
  const selectedRating = localRating ?? myRatings[b.id]

  const detail: BeerDetailData = {
    name: b.name,
    name_hebrew: b.name_hebrew ?? null,
    brewery: b.brewery,
    style: b.style,
    abv: b.abv,
    market_tier: b.market_tier as 'mainstream' | 'craft' | 'import',
    color: (b.color as BeerColor) ?? null,
    image_url: b.image_url ?? null,
    ibu: b.ibu ?? null,
    adventurousness: b.adventurousness,
    matchPercent: matchQuery.data ?? null,
    taste: ownerOverlayTaste(overlayQuery.data),
  }

  function onRate(rating: Rating) {
    setLocalRating(rating)
    rateOne.mutate({ beerId: b.id, rating })
  }

  return (
    <main className={`${PAGE_MAIN} py-8 sm:py-10`}>
      <div className="mx-auto max-w-md">
        <BeerDetail
          beer={detail}
          footer={
            <>
              <Show when="signed-in">
                <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
                  <p className="text-sm font-medium text-neutral-800">
                    {t('recommendations.ratePrompt')}
                  </p>
                  <RatingTapper
                    onRate={onRate}
                    selected={selectedRating}
                    disabled={rateOne.isPending}
                    labels={{
                      loved: t('rate.tapper.loved'),
                      fine: t('rate.tapper.fine'),
                      disliked: t('rate.tapper.disliked'),
                    }}
                  />
                  {selectedRating ? (
                    <p role="status" className="text-sm font-medium text-brand-600">
                      {t('recommendations.rateSaved')}
                    </p>
                  ) : null}
                  {rateOne.isError ? (
                    <p role="alert" className="text-sm text-red-600">
                      {t('recommendations.rateError')}
                    </p>
                  ) : null}
                </div>
                <div className="mt-4">
                  <CatchBeerControl beerId={b.id} beerName={b.name} />
                </div>
              </Show>
              <Show when="signed-out">
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-sm text-neutral-600">{t('beerDetail.route.ctaHint')}</p>
                  <Link to="/try">
                    <Button size="lg">{t('beerDetail.route.cta')}</Button>
                  </Link>
                </div>
              </Show>
            </>
          }
        />
      </div>
    </main>
  )
}
