/**
 * Search a specific beer and rate it directly (#220). Rating a result submits a
 * one-beer /rate/session; the row then shows a saved state.
 */
import type { Rating } from '@beerolog/types'
import { Card, Heading, RatingTapper } from '@beerolog/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PAGE_SHELL_X } from '../lib/page-shell'
import { useMyRatings } from '../lib/my-ratings'
import { type SearchBeer, useBeerSearch, useRateOne } from '../lib/rate-search'
import { useDebouncedValue } from '../lib/use-debounced-value'

export function RateSearch() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [rated, setRated] = useState<Record<string, Rating>>({})
  // Debounce feeds react-query's key; the query stays declarative (no manual
  // effect wiring here).
  const debounced = useDebouncedValue(query.trim(), 250)
  const search = useBeerSearch(debounced)
  const rateOne = useRateOne()
  // Server truth for already-rated beers; local `rated` overrides it after a
  // change so the tap feels instant.
  const myRatings = useMyRatings()

  function rate(beer: SearchBeer, rating: Rating) {
    setRated((prev) => ({ ...prev, [beer.id]: rating }))
    rateOne.mutate({ beerId: beer.id, rating })
  }

  return (
    <div className={`mx-auto max-w-md py-6 ${PAGE_SHELL_X}`}>
      <label htmlFor="rate-search" className="text-sm font-medium text-neutral-700">
        {t('rate.search.label')}
      </label>
      <input
        id="rate-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('rate.search.placeholder')}
        autoComplete="off"
        className="mt-1 w-full rounded-lg border border-neutral-300 p-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
      />

      <div className="mt-4 space-y-3">
        <RateSearchResults
          query={debounced}
          isPending={search.isPending}
          isError={search.isError}
          beers={search.data ?? []}
          rated={{ ...myRatings, ...rated }}
          onRate={rate}
        />
      </div>
    </div>
  )
}

function RateSearchResults({
  query,
  isPending,
  isError,
  beers,
  rated,
  onRate,
}: {
  query: string
  isPending: boolean
  isError: boolean
  beers: SearchBeer[]
  rated: Record<string, Rating>
  onRate: (beer: SearchBeer, rating: Rating) => void
}) {
  const { t } = useTranslation()
  // Check the disabled (<2 chars) state before isPending: a disabled react-query
  // still reports status 'pending'.
  if (query.length < 2) {
    return <p className="text-center text-sm text-neutral-500">{t('rate.search.hint')}</p>
  }
  if (isPending) {
    return <p className="text-center text-sm text-neutral-500">{t('rate.search.searching')}</p>
  }
  if (isError) {
    return (
      <p role="alert" className="text-center text-sm text-red-600">
        {t('rate.search.error')}
      </p>
    )
  }
  if (beers.length === 0) {
    return (
      <p className="text-center text-sm text-neutral-500">{t('rate.search.empty', { query })}</p>
    )
  }
  return (
    <>
      {beers.map((beer) => (
        <RateSearchResult key={beer.id} beer={beer} rated={rated[beer.id]} onRate={onRate} />
      ))}
    </>
  )
}

function RateSearchResult({
  beer,
  rated,
  onRate,
}: {
  beer: SearchBeer
  rated: Rating | undefined
  onRate: (beer: SearchBeer, rating: Rating) => void
}) {
  const { t, i18n } = useTranslation()
  const displayName =
    i18n.language.startsWith('he') && beer.name_hebrew ? beer.name_hebrew : beer.name

  return (
    <Card className="border-neutral-200 bg-white p-4 text-start shadow-sm">
      <Heading level={3} className="text-base">
        {displayName}
      </Heading>
      <p className="text-xs text-neutral-600">
        {beer.brewery} · {beer.style} · {beer.abv}%
      </p>
      <div className="mt-3 space-y-2">
        <RatingTapper
          onRate={(r) => onRate(beer, r)}
          selected={rated}
          labels={{
            loved: t('rate.tapper.loved'),
            fine: t('rate.tapper.fine'),
            disliked: t('rate.tapper.disliked'),
          }}
        />
        {rated && (
          <p role="status" className="text-sm font-medium text-brand-600">
            {t('rate.search.saved')}
          </p>
        )}
      </div>
    </Card>
  )
}
