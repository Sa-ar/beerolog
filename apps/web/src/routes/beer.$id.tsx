/**
 * /beer/$id — public, shareable per-beer page. Renders the same BeerDetail as
 * the in-results modal, but objective-only (no personal overlay), fed by the
 * public GET /catalog/{id}. This is the Share target; a logged-out recipient
 * gets a quiz CTA. Owner-overlay on this route is deferred (#275).
 */
import { Show } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Heading } from '@beerolog/ui'
import { apiClient } from '../lib/api-client/client'
import { BeerDetail, type BeerDetailData } from '../components/BeerDetail'
import { CatchBeerControl } from '../components/CatchBeerControl'
import { PAGE_MAIN } from '@beerolog/shared'
import type { BeerColor } from '../lib/beer-color'
import { capture } from '../lib/analytics'

export const Route = createFileRoute('/beer/$id')({
  component: BeerDetailPage,
})

function BeerDetailPage() {
  const { id } = Route.useParams()
  return <BeerDetailView id={id} />
}

// Extracted so it can be tested without a router context.
export function BeerDetailView({ id }: { id: string }) {
  const { t } = useTranslation()
  const query = useQuery({
    queryKey: ['catalog-beer', id],
    retry: false,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/catalog/{beer_id}', {
        params: { path: { beer_id: id } },
      })
      if (error || !data) throw new Error('not-found')
      return data
    },
  })

  // Must be before any early returns to satisfy Rules of Hooks.
  // Fire once when beer data is available — this is the share-loop landing page.
  useEffect(() => {
    if (!query.data) return
    capture('beer_detail_viewed', { beer_id: query.data.id, market_tier: query.data.market_tier })
  }, [query.data?.id, query.data?.market_tier])

  if (query.isPending) {
    return (
      <main className={`${PAGE_MAIN} py-10`}>
        <p
          data-testid="beer-loading"
          className="animate-pulse text-center text-sm text-neutral-400"
        >
          {t('beerDetail.route.loading')}
        </p>
      </main>
    )
  }

  if (query.isError || !query.data) {
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

  const b = query.data

  const detail: BeerDetailData = {
    name: b.name,
    name_hebrew: b.name_hebrew ?? null,
    brewery: b.brewery,
    style: b.style,
    abv: b.abv,
    market_tier: b.market_tier as 'mainstream' | 'craft' | 'import',
    color: (b.color as BeerColor) ?? null,
    ibu: b.ibu ?? null,
    adventurousness: b.adventurousness,
  }

  return (
    <main className={`${PAGE_MAIN} py-8 sm:py-10`}>
      <div className="mx-auto max-w-md">
        <BeerDetail beer={detail} />
        {/* Signed-in: catch this beer with a proof photo (#330). Signed-out
            recipients of a shared link keep the objective view + quiz CTA. */}
        <Show when="signed-in">
          <CatchBeerControl beerId={b.id} beerName={b.name} />
        </Show>
        <Show when="signed-out">
          <div className="mt-6 flex flex-col items-center gap-2 text-center">
            <p className="text-sm text-neutral-600">{t('beerDetail.route.ctaHint')}</p>
            <Link to="/try">
              <Button size="lg">{t('beerDetail.route.cta')}</Button>
            </Link>
          </div>
        </Show>
      </div>
    </main>
  )
}
