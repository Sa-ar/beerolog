/**
 * Home (`/`) `What I want` deck: loads the signed-in user's baseline picks and
 * feeds them to WantDeck with batch paging (issue #324). A bottom-sheet refiner
 * (SessionQuickPick + "haven't tried yet") re-queries immediately; swipe signals
 * never reshuffle the current batch (we only refetch on a refiner change).
 * Cold-start (no profile) shows a quiz CTA for now; Slice 7 (#328) turns this
 * into a default-profile deck.
 */
import { useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button, Heading } from '@beerolog/ui'
import { apiFetch } from '../lib/api-fetch'
import type { BaselineTaste } from '../lib/baseline-taste'
import { excludeRated } from '../lib/exclude-rated'
import { useMyRatings } from '../lib/my-ratings'
import {
  fetchRecommendationsPage,
  recommendationsLocale,
  WANT_DECK_BATCH,
  type SessionBaseline,
  type SessionRequest,
} from '../lib/session-intent'
import { RefinerSheet } from './RefinerSheet'
import { WantDeck } from './WantDeck'

function Frame({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex w-full flex-1 flex-col overflow-hidden">{children}</main>
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">{children}</div>
}

function toSessionBaseline(b: BaselineTaste): SessionBaseline {
  return {
    bubbles: b.bubbles,
    bitterness: b.bitterness,
    flavor_family: b.flavor_family,
    novelty_affinity: b.novelty_affinity,
  }
}

export function WhatIWantDeck() {
  const { t, i18n } = useTranslation()
  const locale = recommendationsLocale(i18n.language)
  const [session, setSession] = useState<SessionRequest | null>(null)
  const [notTried, setNotTried] = useState(false)
  const [refinerOpen, setRefinerOpen] = useState(false)
  const myRatings = useMyRatings()

  const baselineQuery = useQuery<{ baseline: BaselineTaste } | { noProfile: true }, Error>({
    queryKey: ['deck-baseline'],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const res = await apiFetch('/me/baseline-taste')
      if (res.status === 404) return { noProfile: true }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return { baseline: (await res.json()) as BaselineTaste }
    },
  })

  const baseline =
    baselineQuery.data && 'baseline' in baselineQuery.data ? baselineQuery.data.baseline : null
  const sessionBaseline = baseline ? toSessionBaseline(baseline) : null

  const recs = useInfiniteQuery({
    queryKey: ['want-deck', locale, session],
    enabled: !!sessionBaseline,
    staleTime: 5 * 60 * 1000,
    retry: false,
    initialPageParam: WANT_DECK_BATCH,
    queryFn: ({ pageParam }) =>
      fetchRecommendationsPage({
        baseline: sessionBaseline!,
        ...(session ? { session } : {}),
        topK: pageParam,
        locale,
      }),
    // Each page is the cumulative top_k list (highest-match-first); keeping the
    // last page as the deck preserves order without duplicating the prefix.
    getNextPageParam: (lastPage, allPages) => {
      const requested = allPages.length * WANT_DECK_BATCH
      return lastPage.length >= requested ? requested + WANT_DECK_BATCH : undefined
    },
  })

  if (baselineQuery.isPending) {
    return (
      <Frame>
        <Centered>
          <p className="text-sm text-neutral-400 animate-pulse">{t('whatIWant.loading')}</p>
        </Centered>
      </Frame>
    )
  }
  if (baselineQuery.isError) {
    return (
      <Frame>
        <Centered>
          <p role="alert">{t('whatIWant.error')}</p>
          <Button onClick={() => void baselineQuery.refetch()}>{t('common.tryAgain')}</Button>
        </Centered>
      </Frame>
    )
  }
  if (baseline == null) {
    return (
      <Frame>
        <Centered>
          <p className="text-lg font-semibold">{t('whatIWant.empty')}</p>
          <Link to="/onboarding">
            <Button size="lg">{t('whatIWant.emptyCta')}</Button>
          </Link>
        </Centered>
      </Frame>
    )
  }

  if (recs.isPending) {
    return (
      <Frame>
        <Centered>
          <p className="text-sm text-neutral-400 animate-pulse">{t('whatIWant.loading')}</p>
        </Centered>
      </Frame>
    )
  }
  if (recs.isError) {
    return (
      <Frame>
        <Centered>
          <p role="alert">{t('whatIWant.error')}</p>
          <Button onClick={() => void recs.refetch()}>{t('common.tryAgain')}</Button>
        </Centered>
      </Frame>
    )
  }

  const allBeers = recs.data.pages.at(-1) ?? []
  const beers = notTried ? excludeRated(allBeers, myRatings) : allBeers

  const endCard = (
    <div className="flex flex-col items-center gap-3">
      <Heading level={2} className="text-lg">
        {t('whatIWant.endTitle')}
      </Heading>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={() => setRefinerOpen(true)}>{t('whatIWant.endAdjust')}</Button>
        <Link to="/menu" className="block">
          <Button variant="outline" className="w-full">
            {t('whatIWant.endScan')}
          </Button>
        </Link>
        <Link to="/account/profile" className="block">
          <Button variant="outline" className="w-full">
            {t('whatIWant.endList')}
          </Button>
        </Link>
      </div>
    </div>
  )

  return (
    <Frame>
      <WantDeck
        beers={beers}
        hasMore={recs.hasNextPage}
        onNearEnd={() => {
          if (recs.hasNextPage && !recs.isFetchingNextPage) void recs.fetchNextPage()
        }}
        endCard={endCard}
        onOpenRefiner={() => setRefinerOpen(true)}
        resetKey={`${JSON.stringify(session)}|${notTried}`}
      />
      <RefinerSheet
        open={refinerOpen}
        onClose={() => setRefinerOpen(false)}
        baseline={baseline}
        notTried={notTried}
        onToggleNotTried={setNotTried}
        onApply={(s) => {
          setSession(s)
          setRefinerOpen(false)
        }}
      />
    </Frame>
  )
}
