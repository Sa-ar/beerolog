import type { ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CatalogIcon } from '@beerolog/icons'
import { Button, Heading } from '@beerolog/ui'
import type { BaselineTaste } from '../lib/baseline-taste'
import {
  ABV_OPTIONS,
  markSessionPending,
  VIBE_OPTIONS,
  type AbvIntent,
  type SessionBaseline,
  type SessionVibe,
} from '../lib/session-intent'
import { capture } from '../lib/analytics'

type SessionQuickPickProps = {
  baseline: BaselineTaste
}

function toSessionBaseline(baseline: BaselineTaste): SessionBaseline {
  return {
    bubbles: baseline.bubbles,
    bitterness: baseline.bitterness,
    flavor_family: baseline.flavor_family,
    novelty_affinity: baseline.novelty_affinity,
  }
}

export function SessionQuickPick({ baseline }: SessionQuickPickProps) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [vibe, setVibe] = useState<SessionVibe | null>(null)
  const [abv, setAbv] = useState<AbvIntent | null>(null)
  const [freeText, setFreeText] = useState('')
  const [navigating, setNavigating] = useState(false)

  const canSubmit = vibe !== null && abv !== null && !navigating

  function handleSubmit() {
    if (!canSubmit || vibe === null || abv === null) return
    capture('session_started', { vibe, abv, has_free_text: freeText.trim().length > 0 })
    setNavigating(true)
    markSessionPending({
      baseline: toSessionBaseline(baseline),
      session: { vibe, abv_intent: abv, free_text: freeText.trim() },
    })
    navigate({ to: '/recommendations' })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Heading level={2} className="text-lg font-semibold text-neutral-900">{t('session.start')}</Heading>
        <p className="text-sm text-neutral-600">{t('session.intro')}</p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {t('session.vibeLegend')}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {VIBE_OPTIONS.map((opt) => (
            <OptionChip
              key={opt}
              selected={vibe === opt}
              label={t(`enums.vibe.${opt}.label`)}
              hint={t(`enums.vibe.${opt}.hint`)}
              onClick={() => setVibe(opt)}
              icon={<CatalogIcon group="session.vibe" iconKey={opt} className="h-8 w-8 shrink-0" />}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          {t('session.abvLegend')}
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ABV_OPTIONS.map((opt) => (
            <OptionChip
              key={opt}
              selected={abv === opt}
              label={t(`enums.abv.${opt}.label`)}
              hint={t(`enums.abv.${opt}.hint`)}
              onClick={() => setAbv(opt)}
              icon={<CatalogIcon group="session.abv" iconKey={opt} className="h-8 w-8 shrink-0" />}
            />
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label
          htmlFor="session-free-text"
          className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
        >
          {t('session.tellMore')}{' '}
          <span className="font-normal normal-case text-neutral-400">{t('session.optional')}</span>
        </label>
        <textarea
          id="session-free-text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={t('session.placeholder')}
          className="w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50/80 px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
        <p className="text-xs text-neutral-400">{t('session.sensitiveDataNote')}</p>
      </div>

      <Button
        className="w-full"
        size="lg"
        disabled={!canSubmit}
        onClick={handleSubmit}
      >
        {t('session.submit')}
      </Button>
    </div>
  )
}

function OptionChip({
  selected,
  label,
  hint,
  icon,
  onClick,
}: {
  selected: boolean
  label: string
  hint: string
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all',
        selected
          ? 'border-brand-500 bg-brand-50 shadow-sm ring-2 ring-brand-500/30'
          : 'border-neutral-200 bg-neutral-50/80 hover:border-brand-300 hover:bg-brand-50/40',
      ].join(' ')}
    >
      <span className="flex h-9 w-9 items-center justify-center">{icon}</span>
      <span className="text-xs font-semibold text-neutral-900">{label}</span>
      <span className="text-[10px] leading-tight text-neutral-500">{hint}</span>
    </button>
  )
}
