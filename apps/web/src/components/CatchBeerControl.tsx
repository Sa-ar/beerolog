/**
 * Signed-in "catch this beer" control on the beer detail page (issue #330).
 * A Catch = a Rating finalized with a proof photo (ADR 0011): snap a photo, we
 * upload it to Blob via /api/proof-upload, then record the rating with the
 * proof. The objective, signed-out share view is untouched.
 */
import type { Rating } from '@beerolog/types'
import { Button } from '@beerolog/ui'
import { useMutation } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { apiClient } from '../lib/api-client/client'
import { capture } from '../lib/analytics'
import { normalizeLang } from '../i18n/locale-cookie'
import { shareCatch } from '../lib/share-catch'

type Phase =
  | { step: 'idle' }
  | { step: 'uploading' }
  | { step: 'rating'; photoUrl: string }
  | { step: 'saving' }
  | { step: 'caught'; photoUrl: string; rating: Rating }
  | { step: 'error' }

async function uploadProofPhoto(file: File): Promise<string> {
  // Same-origin: the Clerk session cookie authenticates /api/proof-upload, so no
  // bearer header is needed here.
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/proof-upload', { method: 'POST', body: form })
  if (!res.ok) throw new Error('upload-failed')
  const { url } = (await res.json()) as { url: string }
  return url
}

export function CatchBeerControl({ beerId, beerName }: { beerId: string; beerName: string }) {
  const { t, i18n } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>({ step: 'idle' })

  const save = useMutation({
    mutationFn: async ({ photoUrl, rating }: { photoUrl: string; rating: Rating }) => {
      const { error } = await apiClient.POST('/ratings', {
        body: {
          beer_id: beerId,
          rating,
          proof_photo_url: photoUrl,
          proof_source: 'self_photo',
        },
      })
      if (error) throw new Error('save-failed')
    },
  })

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the user re-pick the same file after an error
    if (!file) return
    setPhase({ step: 'uploading' })
    try {
      const photoUrl = await uploadProofPhoto(file)
      setPhase({ step: 'rating', photoUrl })
    } catch {
      setPhase({ step: 'error' })
    }
  }

  async function onRate(rating: Rating) {
    if (phase.step !== 'rating') return
    const { photoUrl } = phase
    setPhase({ step: 'saving' })
    try {
      await save.mutateAsync({ photoUrl, rating })
      capture('beer_caught', { beer_id: beerId, rating })
      setPhase({ step: 'caught', photoUrl, rating })
    } catch {
      setPhase({ step: 'error' })
    }
  }

  return (
    <div className="mt-6 flex flex-col items-center gap-3 text-center">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />

      {phase.step === 'idle' ? (
        <>
          <Button size="lg" className="cursor-pointer" onClick={() => inputRef.current?.click()}>
            {t('beerDetail.catch.cta')}
          </Button>
          <p className="text-sm text-neutral-600">{t('beerDetail.catch.hint')}</p>
        </>
      ) : null}

      {phase.step === 'uploading' ? (
        <p className="animate-pulse text-sm text-neutral-500">{t('beerDetail.catch.uploading')}</p>
      ) : null}

      {phase.step === 'rating' ? (
        <div className="flex flex-col items-center gap-2">
          <p className="text-sm font-medium">{t('beerDetail.catch.ratePrompt')}</p>
          <div className="flex gap-2" role="group" aria-label={t('beerDetail.catch.ratePrompt')}>
            {(['loved', 'fine', 'disliked'] as const).map((r) => (
              <Button
                key={r}
                variant="outline"
                className="cursor-pointer"
                onClick={() => void onRate(r)}
              >
                {t(`beerDetail.catch.${r}`)}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {phase.step === 'saving' ? (
        <p className="animate-pulse text-sm text-neutral-500">{t('beerDetail.catch.saving')}</p>
      ) : null}

      {phase.step === 'caught' ? (
        <div role="status" className="flex flex-col items-center gap-3">
          <div>
            <p className="text-lg font-semibold">{t('beerDetail.catch.caught')}</p>
            <p className="text-sm text-neutral-600">{t('beerDetail.catch.caughtDetail')}</p>
          </div>
          <Button
            size="lg"
            className="cursor-pointer"
            onClick={() =>
              void shareCatch({
                beerId,
                name: beerName,
                rating: phase.rating,
                photo: phase.photoUrl,
                lang: normalizeLang(i18n.language),
                text: t('share.catch.text'),
              })
            }
          >
            {t('beerDetail.catch.share')}
          </Button>
        </div>
      ) : null}

      {phase.step === 'error' ? (
        <div className="flex flex-col items-center gap-2">
          <p role="alert" className="text-sm text-red-600">
            {t('beerDetail.catch.error')}
          </p>
          <Button
            variant="outline"
            className="cursor-pointer"
            onClick={() => setPhase({ step: 'idle' })}
          >
            {t('common.tryAgain')}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
