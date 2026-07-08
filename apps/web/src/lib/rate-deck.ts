/**
 * Deck data + progression for the /rate flow. The deck is server state
 * (react-query); index/swipes are local UI state; completion batch-submits via
 * a mutation. The route component only deals with presentation.
 */
import type { Rating } from '@beerolog/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
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

const DECK_KEY = ['rate', 'deck'] as const

async function fetchDeck(): Promise<DeckBeer[]> {
  const { data, error } = await apiClient.GET('/rate/deck')
  if (error || !data) throw new Error('Failed to load deck')
  return data.beers
}

export function useRateDeck() {
  const queryClient = useQueryClient()
  const deck = useQuery({ queryKey: DECK_KEY, queryFn: fetchDeck, staleTime: 0, retry: false })
  const [index, setIndex] = useState(0)
  const [swipes, setSwipes] = useState<Swipe[]>([])

  const submit = useMutation({
    mutationFn: async (all: Swipe[]) => {
      const { data, error } = await apiClient.POST('/rate/session', { body: { swipes: all } })
      if (error) throw new Error('Failed to submit ratings')
      return data?.recorded ?? all.length
    },
  })

  const restart = useCallback(() => {
    setIndex(0)
    setSwipes([])
    submit.reset()
    void queryClient.resetQueries({ queryKey: DECK_KEY })
  }, [queryClient, submit])

  function rate(rating: Rating, note?: string) {
    const beers = deck.data
    if (!beers) return
    const beer = beers[index]
    if (!beer) return
    const next = [...swipes, { beer_id: beer.id, rating, ...(note ? { note } : {}) }]
    setSwipes(next)
    if (index + 1 >= beers.length) {
      submit.mutate(next)
    } else {
      setIndex(index + 1)
    }
  }

  function undo() {
    if (index === 0) return
    setIndex(index - 1)
    setSwipes(swipes.slice(0, -1))
  }

  const state = ((): RateDeckState => {
    if (submit.isPending) return { status: 'submitting' }
    if (submit.isSuccess) return { status: 'done', count: submit.data ?? swipes.length }
    if (submit.isError) return { status: 'error' }
    if (deck.isPending) return { status: 'loading' }
    if (deck.isError || !deck.data) return { status: 'error' }
    if (deck.data.length === 0) return { status: 'empty' }
    return { status: 'rating', deck: deck.data, index, swipes }
  })()

  return { state, rate, undo, restart }
}
