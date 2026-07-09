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

export function useSwipeCard(onCommit: (rating: Rating) => void) {
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
    const rating = resolveSwipe(dx, dy, SWIPE_THRESHOLD)
    if (rating) onCommit(rating)
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
