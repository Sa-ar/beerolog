import { useAuth } from '@clerk/tanstack-react-start'
import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '@beerolog/ui'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { setAgeVerified } from '../lib/age-consent-cookie'

export function AgeVerificationGate({ initialVerified }: { initialVerified: boolean }) {
  const [gateOpen, setGateOpen] = useState(!initialVerified)
  const [mounted, setMounted] = useState(!initialVerified)
  const [denied, setDenied] = useState(false)
  const { isLoaded, isSignedIn } = useAuth()
  const { t } = useTranslation()

  // Cookie already verified — never mount.
  // Signed-in users skip once Clerk knows they are signed in. Do NOT hide the
  // gate while Clerk is still loading: that left guests with no confirm button
  // and, once Clerk hydrated, an inert dialog over quiz-question.
  if (!mounted) {
    return null
  }
  if (isLoaded && isSignedIn) {
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
      <DialogContent
        data-testid="age-gate"
        aria-labelledby="age-gate-title"
        aria-describedby="age-gate-description"
      >
        {denied ? (
          <>
            <DialogTitle id="age-gate-title">{t('ageGate.deniedTitle')}</DialogTitle>
            <DialogDescription id="age-gate-description">{t('ageGate.deniedBody')}</DialogDescription>
          </>
        ) : (
          <>
            <DialogTitle id="age-gate-title">{t('ageGate.title')}</DialogTitle>
            <DialogDescription id="age-gate-description">{t('ageGate.body')}</DialogDescription>
            <p dir="auto" className="mt-3 text-sm font-medium text-amber-900">{t('footer.alcoholWarning')}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
              <Button
                type="button"
                className="w-full sm:w-auto"
                data-testid="age-gate-confirm"
                onClick={handleConfirm}
              >
                {t('ageGate.confirm')}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                data-testid="age-gate-deny"
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
