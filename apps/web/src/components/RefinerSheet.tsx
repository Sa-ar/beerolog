/**
 * `What I want` refiner bottom sheet (issue #324). Reuses SessionQuickPick
 * (vibe + ABV + free text) to re-query in place, plus a "haven't tried yet"
 * toggle. Built on the shared Dialog primitive for focus trap + Escape +
 * return-focus; styled (self-end, rounded top) as a bottom sheet.
 */
import { Button, Dialog, DialogContent } from '@beerolog/ui'
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
  return (
    <Dialog
      open={open}
      dismissible
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent
        aria-label={t('refiner.title')}
        className="max-h-[85dvh] max-w-md self-end rounded-t-3xl rounded-b-none border-0 p-5"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-neutral-300" aria-hidden />
        <div className="mb-4 flex justify-end">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            {t('common.close')}
          </Button>
        </div>
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
      </DialogContent>
    </Dialog>
  )
}