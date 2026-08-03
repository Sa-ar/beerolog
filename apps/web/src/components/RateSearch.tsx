/**
 * Search a specific beer and rate it directly (#220). Rating a result submits a
 * one-beer /rate/session; the row then shows a saved state.
 */
import type { Rating } from '@beerolog/types'
import { Card, Heading, RatingTapper } from '@beerolog/ui'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PAGE_SHELL_X } from '@beerolog/shared'
import { useMyRatings } from '../lib/my-ratings'
import { type SearchBeer, useBeerSearch, useRateOne } from '../lib/rate-search'
import { useDebouncedValue } from '../lib/use-debounced-value'
import { displayBeerName } from '../lib/display-beer-name'

export function RateSearch() {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [rated, setRated] = useState<Record<string, Rating>>({})
  const [failed, setFailed] = useState<Record<string, boolean>>({})
  // Debounce feeds react-query's key; the query stays declarative (no manual
  // effect wiring here).
  const debounced = useDebouncedValue(query.trim(), 250)
  const search = useBeerSearch(debounced)
  const rateOne = useRateOne()
  // Server truth for already-rated beers; local `rated` overrides it after a
  // change so the tap feels instant.
  const myRatings = useMyRatings()
  // Order same-beer saves: each takes a seq and a save's onError only rolls back
  // if it's still the latest — so a slow older request can't clobber a newer one.
  const saveSeq = useRef(0)
  const latestSeq = useRef<Record<string, number>>({})

  function rate(beer: SearchBeer, rating: Rating) {
    const seq = ++saveSeq.current
    latestSeq.current[beer.id] = seq
    // Optimistically show the new rating; capture the prior local value so a
    // failed POST rolls back instead of leaving a false "saved" and silently
    // dropping the rating.
    const previous = rated[beer.id]
    setRated((prev) => ({ ...prev, [beer.id]: rating }))
    setFailed((prev) => {
      if (!prev[beer.id]) return prev
      const next = { ...prev }
      delete next[beer.id]
      return next
    })
    rateOne.mutate(
      { beerId: beer.id, rating },
      {
        onError: () => {
          // Superseded by a newer save for this beer — leave its result intact.
          if (latestSeq.current[beer.id] !== seq) return
          setRated((prev) => {
            const next = { ...prev }
            if (previous === undefined) delete next[beer.id]
            else next[beer.id] = previous
            return next
          })
          setFailed((prev) => ({ ...prev, [beer.id]: true }))
        },
      },
    )
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
          failed={failed}
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
  failed,
  onRate,
}: {
  query: string
  isPending: boolean
  isError: boolean
  beers: SearchBeer[]
  rated: Record<string, Rating>
  failed: Record<string, boolean>
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
        <RateSearchResult
          key={beer.id}
          beer={beer}
          rated={rated[beer.id]}
          failed={failed[beer.id]}
          onRate={onRate}
        />
      ))}
    </>
  )
}

function RateSearchResult({
  beer,
  rated,
  failed,
  onRate,
}: {
  beer: SearchBeer
  rated: Rating | undefined
  failed: boolean | undefined
  onRate: (beer: SearchBeer, rating: Rating) => void
}) {
  const { t, i18n } = useTranslation()
  const displayName = displayBeerName(beer, i18n.language)

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
        {failed && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {t('rate.search.saveError')}
          </p>
        )}
        {!failed && rated && (
          <p role="status" className="text-sm font-medium text-brand-600">
            {t('rate.search.saved')}
          </p>
        )}
      </div>
    </Card>
  )
}
