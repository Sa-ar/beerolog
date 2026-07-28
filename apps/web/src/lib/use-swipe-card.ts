/**
 * Pointer-driven four-way swipe for the deck card (issue #4). Thin glue over
 * swipe-rating.ts: tracks the drag offset, and on release commits the resolved
 * rating or snaps back. Native Pointer Events — no gesture library.
 */
import type { Rating } from '@beerolog/types'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { useRef, useState } from 'react'
import { activeDirection, resolveSwipe, swipeProgress, type SwipeDirection } from './swipe-rating'

export const SWIPE_THRESHOLD = 96

export type SwipeState = {
  dx: number
  dy: number
  dragging: boolean
  direction: SwipeDirection | null
  progress: number
}

const IDLE: SwipeState = { dx: 0, dy: 0, dragging: false, direction: null, progress: 0 }

// Generic over the committed value so both decks reuse the pointer glue:
// `What I know` commits a Rating (default resolver), `What I want` commits a
// WantAction via a resolver passed in by the deck.
export function useSwipeCard<T = Rating>(
  onCommit: (value: T) => void,
  resolve: (dx: number, dy: number, threshold: number) => T | null = resolveSwipe as (
    dx: number,
    dy: number,
    threshold: number,
  ) => T | null,
) {
  const [state, setState] = useState<SwipeState>(IDLE)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const liveRef = useRef({ dx: 0, dy: 0 })

  function onPointerDown(e: ReactPointerEvent) {
    // Let taps on the accessible controls (buttons, note field) work untouched.
    if ((e.target as HTMLElement).closest('button, textarea, a, input')) return
    startRef.current = { x: e.clientX, y: e.clientY }
    liveRef.current = { dx: 0, dy: 0 }
    setState({ ...IDLE, dragging: true })
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: ReactPointerEvent) {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    liveRef.current = { dx, dy }
    setState({
      dx,
      dy,
      dragging: true,
      direction: activeDirection(dx, dy),
      progress: swipeProgress(dx, dy, SWIPE_THRESHOLD),
    })
  }

  function end() {
    if (!startRef.current) return
    const { dx, dy } = liveRef.current
    startRef.current = null
    setState(IDLE)
    const value = resolve(dx, dy, SWIPE_THRESHOLD)
    if (value != null) onCommit(value)
  }

  return {
    state,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel: end,
    },
  }
}
