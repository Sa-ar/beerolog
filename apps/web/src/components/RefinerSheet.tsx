/**
 * `What I want` refiner bottom sheet (issue #324). Reuses SessionQuickPick
 * (vibe + ABV + free text) to re-query in place, plus a "haven't tried yet"
 * toggle. Fixed-position overlay so it slides over the deck with zero page
 * layout shift; α/β tuning stays hidden.
 */
import { useTranslation } from 'react-i18next'
import type { BaselineTaste } from '../lib/baseline-taste'
import type { SessionRequest } from '../lib/session-intent'
import { SessionQuickPick } from './SessionQuickPick'

export function RefinerSheet({
  open,
  onClose,
  baseline,
  notTried,
  onToggleNotTried,
  onApply,
}: {
  open: boolean
  onClose: () => void
  baseline: BaselineTaste
  notTried: boolean
  onToggleNotTried: (value: boolean) => void
  onApply: (session: SessionRequest) => void
}) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={t('refiner.title')}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div className="relative max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-300" aria-hidden />
        <label className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3">
          <span className="text-sm font-medium text-neutral-800">{t('refiner.notTried')}</span>
          <input
            type="checkbox"
            checked={notTried}
            onChange={(e) => onToggleNotTried(e.target.checked)}
            className="h-5 w-5 cursor-pointer"
          />
        </label>
        <SessionQuickPick baseline={baseline} onApply={onApply} />
      </div>
    </div>
  )
}
