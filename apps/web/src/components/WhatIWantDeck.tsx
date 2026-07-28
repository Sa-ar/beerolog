/**
 * Home (`/`) `What I want` deck: loads the signed-in user's baseline picks and
 * feeds them to WantDeck. Cold-start (no profile) shows a quiz CTA for now;
 * Slice 7 (#328) turns this into a default-profile deck. Paging + refiners land
 * in Slice 3 (#324).
 *
 * ponytail: reuses the baseline path from session-intent rather than sharing
 * recommendations.tsx's larger resolver — a few lines vs. threading that route's
 * session/guest-hydration logic. Consolidate if a third caller appears.
 */
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@beerolog/ui'
import { apiFetch } from '../lib/api-fetch'
import { fetchBaselineRecommendations, recommendationsLocale } from '../lib/session-intent'
import type { RecommendedBeer } from './RecommendationBeerCard'
import { WantDeck } from './WantDeck'

type DeckData = { results: RecommendedBeer[]; noProfile: boolean }

function Frame({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto flex w-full flex-1 flex-col overflow-hidden">{children}</main>
}

export function WhatIWantDeck() {
  const { t, i18n } = useTranslation()
  const locale = recommendationsLocale(i18n.language)

  const recs = useQuery<DeckData, Error>({
    queryKey: ['want-deck', locale],
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const res = await apiFetch('/me/baseline-taste')
      if (res.status === 404) return { results: [], noProfile: true }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const record = (await res.json()) as {
        bubbles: number
        bitterness: number
        flavor_family: Record<string, number>
        novelty_affinity: number
      }
      const payload = await fetchBaselineRecommendations(
        {
          bubbles: record.bubbles,
          bitterness: record.bitterness,
          flavor_family: record.flavor_family,
          novelty_affinity: record.novelty_affinity,
        },
        locale,
      )
      return { results: payload.results, noProfile: false }
    },
  })

  if (recs.isPending) {
    return (
      <Frame>
        <p className="py-16 text-center text-sm text-neutral-400 animate-pulse">
          {t('whatIWant.loading')}
        </p>
      </Frame>
    )
  }

  if (recs.isError) {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p role="alert">{t('whatIWant.error')}</p>
          <Button onClick={() => void recs.refetch()}>{t('common.tryAgain')}</Button>
        </div>
      </Frame>
    )
  }

  if (recs.data.noProfile || recs.data.results.length === 0) {
    return (
      <Frame>
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-lg font-semibold">{t('whatIWant.empty')}</p>
          <Link to="/onboarding">
            <Button size="lg">{t('whatIWant.emptyCta')}</Button>
          </Link>
        </div>
      </Frame>
    )
  }

  return (
    <Frame>
      <WantDeck beers={recs.data.results} />
    </Frame>
  )
}
