/**
 * Pure geometry for the deck's four-way swipe (issue #4). Direction → rating,
 * plus progress toward the commit threshold for the fade-in choice stamp. Kept
 * side-effect free so it's unit-testable; the pointer wiring is thin glue.
 *
 * right = loved, left = disliked, up = fine, down = unknown.
 */
import { RATINGS, type Rating } from '@beerolog/types'

export type SwipeDirection = 'right' | 'left' | 'up' | 'down'

export const DIRECTION_RATING: Record<SwipeDirection, Rating> = {
  right: RATINGS.loved,
  left: RATINGS.disliked,
  up: RATINGS.fine,
  down: RATINGS.unknown,
}

export function activeDirection(dx: number, dy: number): SwipeDirection | null {
  if (dx === 0 && dy === 0) return null
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

function axisDistance(dx: number, dy: number, dir: SwipeDirection): number {
  return dir === 'right' || dir === 'left' ? Math.abs(dx) : Math.abs(dy)
}

export function swipeProgress(dx: number, dy: number, threshold: number): number {
  const dir = activeDirection(dx, dy)
  if (!dir) return 0
  return Math.min(1, axisDistance(dx, dy, dir) / threshold)
}

/** The rating to commit on release, or null if the drag didn't clear the threshold. */
export function resolveSwipe(dx: number, dy: number, threshold: number): Rating | null {
  const dir = activeDirection(dx, dy)
  if (!dir) return null
  return axisDistance(dx, dy, dir) >= threshold ? DIRECTION_RATING[dir] : null
}
