/**
 * `What I want` deck swipe vocabulary (issue #323): right = want, left = pass,
 * up = must-try. Pure geometry over the shared swipe primitives so it's
 * unit-testable; the pointer wiring reuses use-swipe-card.
 *
 * RTL mirrors the horizontal axis: in Hebrew a physical right-swipe still means
 * "want" because the whole layout is mirrored, so we flip left<->right on the
 * raw pointer delta before mapping to an action.
 */
import { activeDirection, type SwipeDirection } from './swipe-rating'

export type WantAction = 'want' | 'pass' | 'must_try'

const DIRECTION_WANT: Record<SwipeDirection, WantAction | null> = {
  right: 'want',
  left: 'pass',
  up: 'must_try',
  down: null,
}

function mirrorHorizontal(dir: SwipeDirection): SwipeDirection {
  if (dir === 'left') return 'right'
  if (dir === 'right') return 'left'
  return dir
}

/** Logical action for a live drag direction (null for none / down). */
export function wantActionForDirection(
  dir: SwipeDirection | null,
  rtl = false,
): WantAction | null {
  if (!dir) return null
  return DIRECTION_WANT[rtl ? mirrorHorizontal(dir) : dir]
}

function axisDistance(dx: number, dy: number, dir: SwipeDirection): number {
  return dir === 'right' || dir === 'left' ? Math.abs(dx) : Math.abs(dy)
}

/** The action to commit on release, or null if the drag didn't clear threshold. */
export function resolveWantSwipe(
  dx: number,
  dy: number,
  threshold: number,
  rtl = false,
): WantAction | null {
  const dir = activeDirection(dx, dy)
  if (!dir) return null
  if (axisDistance(dx, dy, dir) < threshold) return null
  return wantActionForDirection(dir, rtl)
}
