/**
 * Home (`/`) `What I want` deck: loads the signed-in user's baseline picks and
 * feeds them to WantDeck with batch paging (issue #324). A bottom-sheet refiner
 * (SessionQuickPick + "haven't tried yet") re-queries immediately; swipe signals
 * never reshuffle the current batch (we only refetch on a refiner change).
 * Cold-start (no profile) shows a quiz CTA for now; Slice 7 (#328) turns this
 * into a default-profile deck.
 */
import { useRef, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button, Heading } from '@beerolog/ui'
import { apiFetch } from '../lib/api-fetch'
import { capture } from '../lib/analytics'
import type { BaselineTaste } from '../lib/baseline-taste'
import { excludeRated } from '../lib/exclude-rated'
import { DEFAULT_MATCH_CALIBRATION, tonightMatchPercent } from '../lib/match-score'
import { useMyRatings } from '../lib/my-ratings'
import { useScanMenu, type MenuScanResultItem } from '../lib/menu-scan'
import { useAddWantToTry } from '../lib/use-want-to-try'
import type { RecommendedBeer } from './RecommendationBeerCard'
import {
  DEFAULT_SESSION_BASELINE,
  fetchRecommendationsPage,
  recommendationsLocale,
  WANT_DECK_BATCH,
  type SessionBaseline,
  type SessionRequest,
} from '../lib/session-intent'
import { RefinerSheet } from './RefinerSheet'
import { WantDeck, type DeckCard } from './WantDeck'

// The deck's match % is fixed (not result-set normalized); baseline path uses
// no tonight session. Missing breakdown (e.g. test fixtures) degrades to null.
function recommendedToCard(beer: RecommendedBeer): DeckCard {
  return {
    id: beer.id,
    name: beer.name,
    name_hebrew: beer.name_hebrew ?? null,
    brewery: beer.brewery,
    style: beer.style,
    abv: beer.abv,
    image_url: beer.image_url,
    color: beer.color ?? null,
    matchPercent: beer.breakdown
      ? tonightMatchPercent(beer.breakdown, false, DEFAULT_MATCH_CALIBRATION, 0.3)
      : null,
    why: beer.why?.text ?? null,
  }
}

// Menu-scan results are already menu-scoped and taste-ranked; taste_fit (0..1)
// becomes the card's match %. Only catalog-matched rows form the scoped deck.
function scanItemToCard(item: MenuScanResultItem): DeckCard {
  return {
    id: item.matched_id as string,
    name: item.name ?? item.raw_text,
    name_hebrew: null,
    brewery: item.brewery ?? '',
    style: item.style ?? '',
    abv: item.abv ?? 0,
    image_url: null,
    color: null,
    matchPercent: item.taste_fit != null ? Math.round(item.taste_fit * 100) : null,
    why: null,
  }
}

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
  const [showQuizLead, setShowQuizLead] = useState(true)
  const [scoped, setScoped] = useState<{ label: string; cards: DeckCard[] } | null>(null)
  const myRatings = useMyRatings()
  const addWant = useAddWantToTry()
  const scan = useScanMenu()
  const fileRef = useRef<HTMLInputElement>(null)

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
  const hasProfile = baseline != null
  // No-profile users get a usable default deck immediately (no quiz wall, #328).
  const effectiveBaseline = baseline ? toSessionBaseline(baseline) : DEFAULT_SESSION_BASELINE

  const recs = useInfiniteQuery({
    queryKey: ['want-deck', locale, session, hasProfile],
    enabled: baselineQuery.isSuccess,
    staleTime: 5 * 60 * 1000,
    retry: false,
    initialPageParam: WANT_DECK_BATCH,
    queryFn: ({ pageParam }) =>
      fetchRecommendationsPage({
        baseline: effectiveBaseline,
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
  const filtered = notTried ? excludeRated(allBeers, myRatings) : allBeers
  const cards = scoped ? scoped.cards : filtered.map(recommendedToCard)

  // Menu scan is its own first-class action — never merged into the refiner or
  // free text. On success the deck reloads scoped to the extracted catalog
  // beers, ranked match-first. The menu-scan AI chat stays on /menu (deferred
  // within this slice), not merged here.
  function onScanFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    scan.mutate(
      { file },
      {
        onSuccess: (results) => {
          const scopedCards = results
            .filter((r) => r.matched_id)
            .map(scanItemToCard)
            .sort((a, b) => (b.matchPercent ?? -1) - (a.matchPercent ?? -1))
          capture('menu_scan_scoped', { matched: scopedCards.length })
          setScoped({ label: t('whatIWant.scanMenuLabel'), cards: scopedCards })
        },
      },
    )
  }

  const onSignal = (beerId: string, action: 'want' | 'pass' | 'must_try') => {
    // Right-swipe persists `want`; super-like persists `must_try`. Pass (left)
    // is not saved. The API also feeds the taste signal (#325).
    if (action === 'want') {
      addWant.mutate({ beerId, state: 'want' })
      capture('want_to_try_added', { state: 'want' })
    } else if (action === 'must_try') {
      addWant.mutate({ beerId, state: 'must_try' })
      capture('want_to_try_added', { state: 'must_try' })
    }
  }

  const endCard = (
    <div className="flex flex-col items-center gap-3">
      <Heading level={2} className="text-lg">
        {t('whatIWant.endTitle')}
      </Heading>
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Button onClick={() => setRefinerOpen(true)}>{t('whatIWant.endAdjust')}</Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()}>
          {t('whatIWant.endScan')}
        </Button>
        <Link to="/account/profile" className="block">
          <Button variant="outline" className="w-full">
            {t('whatIWant.endList')}
          </Button>
        </Link>
      </div>
    </div>
  )

  const scopedEndCard = (
    <div className="flex flex-col items-center gap-3">
      <p className="text-lg font-semibold">{t('whatIWant.scanEnd')}</p>
      <Button onClick={() => setScoped(null)}>{t('whatIWant.scanClear')}</Button>
    </div>
  )

  // Persistent header quiz entry — stays until a profile exists (#328).
  const quizBanner = !hasProfile ? (
    <Link to="/onboarding" className="mx-auto block w-full max-w-md px-4 pt-2">
      <div className="rounded-xl bg-brand-500/15 px-3 py-2 text-center text-sm font-semibold text-brand-200">
        {t('whatIWant.quizBanner')}
      </div>
    </Link>
  ) : null

  // Cold start: the quiz CTA is the first card (skippable, not a wall).
  if (!hasProfile && showQuizLead) {
    return (
      <Frame>
        {quizBanner}
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <Heading level={2} className="text-2xl">
            {t('whatIWant.leadTitle')}
          </Heading>
          <p className="text-neutral-500">{t('whatIWant.leadBody')}</p>
          <Link to="/onboarding" className="w-full max-w-xs">
            <Button size="lg" className="w-full">
              {t('whatIWant.emptyCta')}
            </Button>
          </Link>
          <Button
            variant="outline"
            className="w-full max-w-xs"
            onClick={() => setShowQuizLead(false)}
          >
            {t('whatIWant.leadSkip')}
          </Button>
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      {quizBanner}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        data-testid="menu-scan-input"
        className="hidden"
        onChange={onScanFile}
      />
      {scan.isPending ? (
        <p className="py-2 text-center text-sm text-neutral-400 animate-pulse">
          {t('whatIWant.scanPending')}
        </p>
      ) : null}
      {scan.isError ? (
        <p role="alert" className="py-2 text-center text-sm text-red-600">
          {t('whatIWant.scanError')}
        </p>
      ) : null}
      {scoped ? (
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 px-4 pt-2">
          <span className="truncate rounded-full bg-brand-500/20 px-3 py-1 text-sm text-brand-200">
            {t('whatIWant.scanScopedChip', { label: scoped.label })}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setScoped(null)}>
            {t('whatIWant.scanClear')}
          </Button>
        </div>
      ) : null}
      <WantDeck
        beers={cards}
        onSignal={onSignal}
        hasMore={scoped ? false : recs.hasNextPage}
        {...(scoped
          ? {}
          : {
              onNearEnd: () => {
                if (recs.hasNextPage && !recs.isFetchingNextPage) void recs.fetchNextPage()
              },
              ...(hasProfile ? { onOpenRefiner: () => setRefinerOpen(true) } : {}),
            })}
        endCard={scoped ? scopedEndCard : endCard}
        onScan={() => fileRef.current?.click()}
        resetKey={scoped ? `scoped:${scoped.label}` : `${JSON.stringify(session)}|${notTried}`}
      />
      {baseline ? (
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
      ) : null}
    </Frame>
  )
}
