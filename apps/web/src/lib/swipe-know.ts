/**
 * `What I know` deck swipe vocabulary (issue #326): up = loved, right = fine,
 * left = not-for-me, down = don't-know (skip). Distinct from the legacy rate
 * vocab in swipe-rating.ts. RTL mirrors the horizontal axis so a physical
 * right-swipe still means "fine" in Hebrew. Pure so it's unit-testable.
 */
import { RATINGS, type Rating } from '@beerolog/types'
import { activeDirection, type SwipeDirection } from './swipe-rating'

const KNOW_DIRECTION_RATING: Record<SwipeDirection, Rating> = {
  up: RATINGS.loved,
  right: RATINGS.fine,
  left: RATINGS.disliked,
  down: RATINGS.unknown,
}

function mirrorHorizontal(dir: SwipeDirection): SwipeDirection {
  if (dir === 'left') return 'right'
  if (dir === 'right') return 'left'
  return dir
}

/** Rating for a live drag direction (null for none). */
export function knowRatingForDirection(
  dir: SwipeDirection | null,
  rtl = false,
): Rating | null {
  if (!dir) return null
  return KNOW_DIRECTION_RATING[rtl ? mirrorHorizontal(dir) : dir]
}

function axisDistance(dx: number, dy: number, dir: SwipeDirection): number {
  return dir === 'right' || dir === 'left' ? Math.abs(dx) : Math.abs(dy)
}

/** The rating to commit on release, or null if the drag didn't clear threshold. */
export function resolveKnowSwipe(
  dx: number,
  dy: number,
  threshold: number,
  rtl = false,
): Rating | null {
  const dir = activeDirection(dx, dy)
  if (!dir) return null
  if (axisDistance(dx, dy, dir) < threshold) return null
  return knowRatingForDirection(dir, rtl)
}
