/**
 * `What I want` refiner sheet (issue #324). Reuses SessionQuickPick
 * (vibe + ABV + free text) to re-query in place, plus a "haven't tried yet"
 * toggle. Mobile: bottom sheet. Desktop: centered card sized to fit filters
 * without a tall scroll (α/β tuning stays hidden).
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
      className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center md:p-6"
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
      <div className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl md:max-h-[min(90dvh,40rem)] md:max-w-2xl md:overflow-y-auto md:rounded-2xl md:p-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300 md:hidden" aria-hidden />
        <label className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2.5">
          <span className="text-sm font-medium text-neutral-800">{t('refiner.notTried')}</span>
          <input
            type="checkbox"
            checked={notTried}
            onChange={(e) => onToggleNotTried(e.target.checked)}
            className="h-5 w-5 shrink-0 cursor-pointer"
          />
        </label>
        <SessionQuickPick baseline={baseline} onApply={onApply} compact />
      </div>
    </div>
  )
}
