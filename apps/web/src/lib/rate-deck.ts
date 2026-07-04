/**
 * Deck data + progression for the /rate flow. Encapsulates fetching the deck
 * (POST-on-completion is batched into one /rate/session call) so the route
 * component only deals with presentation.
 *
 * ponytail: plain hook over @tanstack/react-query — the app doesn't depend on
 * react-query and this single-fetch flow doesn't justify adding it. Mirrors the
 * lib-extraction pattern used by /recommendations. Swap to a router loader or
 * react-query if deck fetching grows caching/refetch needs.
 */
import type { Rating } from '@beerolog/types'
import { useEffect, useState } from 'react'
import { apiClient } from './api-client/client'

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
  | { status: 'rating'; deck: DeckBeer[]; index: number; swipes: Swipe[] }
  | { status: 'submitting' }
  | { status: 'done'; count: number }

export function useRateDeck() {
  const [state, setState] = useState<RateDeckState>({ status: 'loading' })

  useEffect(() => {
    let active = true
    void (async () => {
      const { data, error } = await apiClient.GET('/rate/deck')
      if (!active) return
      if (error || !data) {
        setState({ status: 'error' })
        return
      }
      setState(
        data.beers.length
          ? { status: 'rating', deck: data.beers, index: 0, swipes: [] }
          : { status: 'empty' },
      )
    })()
    return () => {
      active = false
    }
  }, [])

  async function submit(swipes: Swipe[]) {
    setState({ status: 'submitting' })
    const { data, error } = await apiClient.POST('/rate/session', { body: { swipes } })
    setState(error ? { status: 'error' } : { status: 'done', count: data?.recorded ?? swipes.length })
  }

  function rate(rating: Rating, note?: string) {
    if (state.status !== 'rating') return
    const beer = state.deck[state.index]
    if (!beer) return
    const swipe: Swipe = { beer_id: beer.id, rating, ...(note ? { note } : {}) }
    const swipes = [...state.swipes, swipe]
    if (state.index + 1 >= state.deck.length) {
      void submit(swipes)
    } else {
      setState({ status: 'rating', deck: state.deck, index: state.index + 1, swipes })
    }
  }

  return { state, rate }
}
