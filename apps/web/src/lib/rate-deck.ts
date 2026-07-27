/**
 * Deck data + progression for the /rate flow. The deck is server state
 * (react-query); the current card index is local UI state. Each swipe is saved
 * immediately (upsert via POST /ratings) so a partial deck still persists — no
 * batch that's lost if you leave mid-deck. The route component is presentation
 * only.
 */
import type { Rating } from '@beerolog/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { apiClient } from './api-client/client'
import { capture } from './analytics'

export type DeckBeer = {
  id: string
  name: string
  name_hebrew?: string | null
  brewery: string
  style: string
  abv: number
}

export type Swipe = { beer_id: string; rating: Rating; note?: string }

export type RateDeckState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'empty' }
  | { status: 'rating'; deck: DeckBeer[]; index: number }
  | { status: 'done'; count: number }

const DECK_KEY = ['rate', 'deck'] as const

async function fetchDeck(): Promise<DeckBeer[]> {
  const { data, error } = await apiClient.GET('/rate/deck')
  if (error || !data) throw new Error('Failed to load deck')
  return data.beers
}

export function useRateDeck() {
  const queryClient = useQueryClient()
  // Keep the deck fresh for the session instead of refetching on every mount.
  // The deck is invalidated when a run finishes (below), not per swipe, so
  // cards don't shift underfoot mid-deck.
  const deck = useQuery({
    queryKey: DECK_KEY,
    queryFn: fetchDeck,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const [index, setIndex] = useState(0)
  const [finished, setFinished] = useState(false)
  const [saveError, setSaveError] = useState(false)

  const save = useMutation({
    mutationFn: async (swipe: Swipe) => {
      const { error } = await apiClient.POST('/ratings', {
        body: {
          beer_id: swipe.beer_id,
          rating: swipe.rating,
          ...(swipe.note ? { note: swipe.note } : {}),
        },
      })
      if (error) throw new Error('Failed to save rating')
    },
    retry: 2,
    onError: () => setSaveError(true),
    onSuccess: () => {
      // Keep the "my ratings" surfaces fresh. The deck is NOT invalidated here
      // (that happens once the run finishes) so the current cards stay put.
      void queryClient.invalidateQueries({ queryKey: ['me', 'ratings', 'count'] })
      void queryClient.invalidateQueries({ queryKey: ['me', 'ratings', 'map'] })
    },
  })

  const restart = useCallback(() => {
    setIndex(0)
    setFinished(false)
    setSaveError(false)
    void queryClient.resetQueries({ queryKey: DECK_KEY })
  }, [queryClient])

  function rate(rating: Rating, note?: string) {
    const beers = deck.data
    if (!beers || finished) return
    const beer = beers[index]
    if (!beer) return
    capture('beer_rated', { rating })
    save.mutate({ beer_id: beer.id, rating, ...(note ? { note } : {}) })
    const nextIndex = index + 1
    setIndex(nextIndex)
    if (nextIndex >= beers.length) {
      capture('rating_session_complete', { count: nextIndex })
      setFinished(true)
      // Run complete: drop the stale deck so a later visit excludes what was
      // just rated. Safe now because we no longer render cards from it.
      void queryClient.invalidateQueries({ queryKey: DECK_KEY })
    }
  }

  function undo() {
    if (index === 0 || finished) return
    // Step back to re-rate a mis-swipe; re-rating upserts over the saved value.
    setIndex(index - 1)
  }

  const state = ((): RateDeckState => {
    if (finished) return { status: 'done', count: index }
    if (deck.isPending) return { status: 'loading' }
    if (deck.isError || !deck.data) return { status: 'error' }
    if (deck.data.length === 0) return { status: 'empty' }
    return { status: 'rating', deck: deck.data, index }
  })()

  return { state, rate, undo, restart, saveError }
}
