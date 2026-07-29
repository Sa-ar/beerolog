/**
 * /catalog — public, crawlable catalog index (#278). Server-rendered listing of
 * the whole beer catalog with links to the per-beer /beer/$id detail pages so
 * search engines (and assistant browsers) can crawl the catalog without the quiz
 * gate. Fed by the public, unauthenticated GET /catalog (listCatalog) endpoint.
 * Emits schema.org ItemList JSON-LD + localized meta. Extends ADR-0007's public
 * surface. No sitemap in the app yet, so nothing to register there.
 */
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Card, Heading, buttonVariants } from '@beerolog/ui'
import { apiClient } from '../lib/api-client/client'
import type { components } from '../lib/api-client/schema'
import { BeerJsonLd } from '../components/BeerJsonLd'
import { BeerColorGlass } from '../components/BeerColorGlass'
import { PAGE_MAIN } from '@beerolog/shared'
import { createI18n } from '../i18n'
import { getLang } from '../i18n/locale-cookie'
import type { BeerColor } from '../lib/beer-color'

type CatalogBeer = components['schemas']['CatalogBeer']

// One crawlable page per window; the prev/next links let crawlers walk the rest.
const PAGE_SIZE = 60

const SITE_URL = (import.meta.env.VITE_WEB_URL as string | undefined) ?? 'https://beerolog.com'

function parsePage(raw: unknown): number {
  const n = Number(raw)
  return Number.isFinite(n) && n > 1 ? Math.floor(n) : 1
}

export const Route = createFileRoute('/catalog')({
  validateSearch: (search: Record<string, unknown>) => ({ page: parsePage(search.page) }),
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: async ({ deps: { page } }) => {
    const { data } = await apiClient.GET('/catalog', {
      params: { query: { page, page_size: PAGE_SIZE } },
    })
    return {
      beers: data?.beers ?? [],
      page: data?.page ?? page,
      pageSize: data?.page_size ?? PAGE_SIZE,
      total: data?.total ?? 0,
    }
  },
  head: () => {
    // No react context in head(); resolve localized meta server-side.
    const lang = getLang()
    const t = createI18n(lang).getFixedT(lang)
    const title = t('catalog.metaTitle')
    const description = t('catalog.metaDescription')
    const pageUrl = `${SITE_URL}/catalog`
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: pageUrl },
      ],
    }
  },
  component: CatalogRoute,
})

function CatalogRoute() {
  const data = Route.useLoaderData()
  return <CatalogIndexView {...data} />
}

// Extracted so it can be tested without a router context.
export function CatalogIndexView({
  beers,
  page,
  pageSize,
  total,
}: {
  beers: CatalogBeer[]
  page: number
  pageSize: number
  total: number
}) {
  const { t } = useTranslation()
  const pages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <main className={`${PAGE_MAIN} py-8 sm:py-10`}>
      <BeerJsonLd beers={beers} />
      <div className="space-y-2">
        <Heading className="text-2xl sm:text-3xl">{t('catalog.title')}</Heading>
        <p className="text-sm text-neutral-600">{t('catalog.intro')}</p>
      </div>

      {beers.length === 0 ? (
        <p className="mt-8 text-center text-sm text-neutral-500">{t('catalog.empty')}</p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {beers.map((beer) => (
            <li key={beer.id}>
              <Link to="/beer/$id" params={{ id: beer.id }} className="block h-full">
                <Card className="flex h-full items-center gap-4 p-4 transition hover:shadow-md">
                  <CatalogThumb imageUrl={beer.image_url ?? null} color={beer.color as BeerColor} />
                  <div className="min-w-0 flex-1 text-start">
                    <p className="truncate font-semibold text-neutral-900">{beer.name}</p>
                    {beer.name_hebrew ? (
                      <p className="truncate text-sm text-neutral-500">{beer.name_hebrew}</p>
                    ) : null}
                    <p className="truncate text-sm text-neutral-600">{beer.brewery}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {beer.style} · {t('catalog.abv', { abv: beer.abv })}
                    </p>
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {pages > 1 ? <CatalogPagination page={page} pages={pages} /> : null}
    </main>
  )
}

function CatalogThumb({ imageUrl, color }: { imageUrl: string | null; color: BeerColor }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        className="h-20 w-20 shrink-0 rounded-lg object-cover ring-1 ring-neutral-200/80"
      />
    )
  }
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-neutral-50 ring-1 ring-neutral-200/80">
      <BeerColorGlass color={color} className="h-12 w-12" />
    </div>
  )
}

function CatalogPagination({ page, pages }: { page: number; pages: number }) {
  const { t } = useTranslation()
  return (
    <nav className="mt-8 flex items-center justify-between gap-4" aria-label={t('catalog.title')}>
      {page > 1 ? (
        <Link
          to="/catalog"
          search={{ page: page - 1 }}
          className={buttonVariants({ variant: 'outline' })}
        >
          {t('catalog.prev')}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-neutral-500">{t('catalog.pageStatus', { page, pages })}</span>
      {page < pages ? (
        <Link
          to="/catalog"
          search={{ page: page + 1 }}
          className={buttonVariants({ variant: 'outline' })}
        >
          {t('catalog.next')}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  )
}
