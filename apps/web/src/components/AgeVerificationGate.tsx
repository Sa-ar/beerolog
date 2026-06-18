import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '@beerolog/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setAgeVerified } from '../lib/age-consent-cookie'

export function AgeVerificationGate({ initialVerified }: { initialVerified: boolean }) {
  const [gateOpen, setGateOpen] = useState(!initialVerified)
  const [mounted, setMounted] = useState(!initialVerified)
  const [denied, setDenied] = useState(false)
  const { t } = useTranslation()

  if (!mounted) {
    return null
  }

  function handleConfirm() {
    setAgeVerified()
    setGateOpen(false)
  }

  function handleOpenChangeComplete(open: boolean) {
    if (!open) {
      setMounted(false)
    }
  }

  return (
    <Dialog open={gateOpen} dismissible={false} onOpenChangeComplete={handleOpenChangeComplete}>
      <DialogContent aria-labelledby="age-gate-title" aria-describedby="age-gate-description">
        {denied ? (
          <>
            <DialogTitle id="age-gate-title">{t('ageGate.deniedTitle')}</DialogTitle>
            <DialogDescription id="age-gate-description">{t('ageGate.deniedBody')}</DialogDescription>
          </>
        ) : (
          <>
            <DialogTitle id="age-gate-title">{t('ageGate.title')}</DialogTitle>
            <DialogDescription id="age-gate-description">{t('ageGate.body')}</DialogDescription>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
              <Button type="button" className="w-full sm:w-auto" onClick={handleConfirm}>
                {t('ageGate.confirm')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setDenied(true)}
              >
                {t('ageGate.deny')}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
