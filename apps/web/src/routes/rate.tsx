/**
 * /rate — Tinder-style deck for rating beers one at a time. Collects swipes and
 * batch-submits them on completion (POST /rate/session). Signed-in only.
 * See docs/prds/beer-rating-feedback.md.
 */

import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '@beerolog/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RateDeckFlow } from '../components/RateDeckFlow'
import { RateSearch } from '../components/RateSearch'
import { PAGE_SHELL_X } from '../lib/page-shell'

export const Route = createFileRoute('/rate')({
  component: RatePage,
})

const RATE_MODE = { deck: 'deck', search: 'search' } as const
type RateMode = (typeof RATE_MODE)[keyof typeof RATE_MODE]

function RatePage() {
  const { t } = useTranslation()
  const [mode, setMode] = useState<RateMode>(RATE_MODE.deck)
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <div className={`mx-auto max-w-md pt-4 ${PAGE_SHELL_X}`}>
          <div className="flex gap-2" role="group" aria-label={t('rate.title')}>
            <Button
              variant={mode === RATE_MODE.deck ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              aria-pressed={mode === RATE_MODE.deck}
              onClick={() => setMode(RATE_MODE.deck)}
            >
              {t('rate.mode.deck')}
            </Button>
            <Button
              variant={mode === RATE_MODE.search ? 'default' : 'outline'}
              size="sm"
              className="flex-1"
              aria-pressed={mode === RATE_MODE.search}
              onClick={() => setMode(RATE_MODE.search)}
            >
              {t('rate.mode.search')}
            </Button>
          </div>
        </div>
        {mode === RATE_MODE.deck ? <RateDeckFlow /> : <RateSearch />}
      </Show>
    </>
  )
}
