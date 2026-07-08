/**
 * /rate — Tinder-style deck for rating beers one at a time. Collects swipes and
 * batch-submits them on completion (POST /rate/session). Signed-in only.
 * See docs/prds/beer-rating-feedback.md.
 */

import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { RateDeckFlow } from '../components/RateDeckFlow'

export const Route = createFileRoute('/rate')({
  component: RatePage,
})

function RatePage() {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <RateDeckFlow />
      </Show>
    </>
  )
}
