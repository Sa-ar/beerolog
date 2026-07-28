/**
 * /account/collection — the user's CatchCollection grid (issue #331). Renders
 * caught beers newest-first, preferring each catch's proof photo; every card
 * links to the beer detail page. Signed-in gate + account chrome come from the
 * parent account layout.
 */
import { Button, Heading } from '@beerolog/ui'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { normalizeLang } from '../i18n/locale-cookie'
import { useCatchCollection } from '../lib/catch-collection'
import { ISRAELI_CRAFT_STARTER, computeSetProgress } from '../lib/set-progress'
import { shareCollection } from '../lib/share-collection'

export const Route = createFileRoute('/account/collection')({
  component: CollectionPage,
})

// Exported for testing without a router/account-layout context.
export function CollectionPage() {
  const { t, i18n } = useTranslation()
  const query = useCatchCollection()

  if (query.isPending) {
    return (
      <p data-testid="collection-loading" className="animate-pulse text-sm text-neutral-400">
        {t('collection.loading')}
      </p>
    )
  }

  if (query.isError || !query.data) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {t('collection.error')}
      </p>
    )
  }

  const { catches, count } = query.data
  const progress = computeSetProgress(
    ISRAELI_CRAFT_STARTER.beerIds,
    catches.map((c) => c.beer_id),
  )

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2 rounded-xl p-4 ring-1 ring-neutral-200/80">
        <div className="flex items-baseline justify-between">
          <Heading level={2} className="text-base font-semibold">
            {t(ISRAELI_CRAFT_STARTER.nameKey)}
          </Heading>
          <span className="text-sm text-neutral-500">
            {t('collection.set.progress', { caught: progress.caught, total: progress.total })}
          </span>
        </div>
        {progress.isComplete ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-medium text-brand-600">{t('collection.set.complete')}</p>
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() =>
                void shareCollection({
                  setKey: ISRAELI_CRAFT_STARTER.key,
                  name: t(ISRAELI_CRAFT_STARTER.nameKey),
                  caught: progress.caught,
                  total: progress.total,
                  lang: normalizeLang(i18n.language),
                  text: t('share.collection.text'),
                })
              }
            >
              {t('collection.set.share')}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-neutral-600">
            {t('collection.set.remaining', { count: progress.missing.length })}
          </p>
        )}
      </section>

      {count === 0 ? (
        <div data-testid="collection-empty" className="flex flex-col items-start gap-2">
          <Heading level={2} className="text-lg font-semibold">
            {t('collection.empty')}
          </Heading>
          <p className="text-sm text-neutral-600">{t('collection.emptyHint')}</p>
          <Link to="/rate" className="text-sm font-medium text-brand-600 underline">
            {t('collection.emptyCta')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <Heading level={2} className="text-lg font-semibold">
              {t('collection.title')}
            </Heading>
            <span className="text-sm text-neutral-500">{t('collection.count', { count })}</span>
          </div>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {catches.map((c) => (
              <li key={c.beer_id}>
                <Link
                  to="/beer/$id"
                  params={{ id: c.beer_id }}
                  className="group block overflow-hidden rounded-xl ring-1 ring-neutral-200/80 transition hover:ring-brand-400"
                >
                  <img src={c.proof_photo_url} alt="" className="aspect-square w-full object-cover" />
                  <span className="block truncate px-2 py-1.5 text-sm font-medium text-neutral-700">
                    {c.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
