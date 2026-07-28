/**
 * Want-to-try list on the Profile tab (issue #325): a horizontal row of saved
 * beers, must-try (super-liked) pinned first, each removable. Renders nothing
 * until there's something to show so the Profile stays clean.
 */
import { useTranslation } from 'react-i18next'
import { Heading } from '@beerolog/ui'
import { BeerColorGlass } from './BeerColorGlass'
import { useRemoveWantToTry, useWantToTryList } from '../lib/use-want-to-try'

export function WantToTryList() {
  const { t } = useTranslation()
  const { data } = useWantToTryList()
  const remove = useRemoveWantToTry()

  if (!data || data.length === 0) return null

  // Defensive: the API already pins must_try first, but keep the order stable
  // if a stale cache slips through.
  const items = [...data].sort(
    (a, b) => Number(b.state === 'must_try') - Number(a.state === 'must_try'),
  )

  return (
    <section aria-label={t('wantToTry.title')} className="space-y-3">
      <Heading level={2} className="text-lg">
        {t('wantToTry.title')}
      </Heading>
      <ul className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => (
          <li key={item.beer_id} className="w-28 shrink-0">
            <div className="relative h-32 overflow-hidden rounded-xl bg-neutral-100 ring-1 ring-neutral-200">
              {item.beer_image_url ? (
                <img src={item.beer_image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">
                  <BeerColorGlass color="gold" className="h-16 w-16" />
                </span>
              )}
              {item.state === 'must_try' ? (
                <span
                  className="absolute end-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-xs font-bold text-[hsl(26_30%_10%)] shadow"
                  aria-label={t('wantToTry.mustTry')}
                >
                  <span aria-hidden>★</span>
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => remove.mutate(item.beer_id)}
                aria-label={t('wantToTry.remove', { beer: item.beer_name })}
                className="absolute bottom-1 end-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-black/80"
              >
                <span aria-hidden>✕</span>
              </button>
            </div>
            <p className="mt-1 truncate text-xs font-medium text-neutral-700">{item.beer_name}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
