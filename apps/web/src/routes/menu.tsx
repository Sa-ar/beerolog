/**
 * /menu — snap a tap-board photo, extract beer names via vision, match them to
 * our catalog and rank the pool by taste (POST /menu/scan). Signed-in only.
 * An optional "tonight's direction" re-ranks the already-scanned pool.
 */

import { Button, Heading } from '@beerolog/ui'
import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PAGE_MAIN } from '../lib/page-shell'
import { useScanMenu } from '../lib/menu-scan'
import { VIBE_OPTIONS, type SessionVibe } from '../lib/session-intent'

export const Route = createFileRoute('/menu')({
  component: MenuPage,
})

function scanButtonLabel(isPending: boolean, hasResults: boolean): string {
  if (isPending) return 'Scanning menu…'
  return hasResults ? 'Scan another photo' : 'Take or upload a photo'
}

function MenuPage() {
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <MenuScanFlow />
      </Show>
    </>
  )
}

// ponytail: vibe is the primary session lever; abv_intent stays 'any' here so
// we don't add a second picker. Add an ABV row if tonight's-strength matters.
// Returns args for useScanMenu, omitting `session` entirely when no vibe is set
// (exactOptionalPropertyTypes forbids passing `session: undefined`).
function scanArgs(file: File, vibe: SessionVibe | null, freeText: string) {
  if (vibe === null) return { file }
  return { file, session: { vibe, abv_intent: 'any' as const, free_text: freeText.trim() } }
}

function MenuScanFlow() {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [lastFile, setLastFile] = useState<File | null>(null)
  const [vibe, setVibe] = useState<SessionVibe | null>(null)
  const [freeText, setFreeText] = useState('')
  const scan = useScanMenu()
  const results = scan.data ?? []

  function runScan(file: File) {
    setLastFile(file)
    scan.mutate(scanArgs(file, vibe, freeText))
  }

  return (
    <main className={`${PAGE_MAIN} py-8`}>
      <Heading className="text-2xl">Scan a menu</Heading>
      <p className="mt-2 text-sm text-neutral-600">
        Snap a tap board and we&rsquo;ll rank the beers by your taste.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) runScan(file)
          e.target.value = ''
        }}
      />

      <Button
        className="mt-6"
        disabled={scan.isPending}
        onClick={() => fileInputRef.current?.click()}
      >
        {scanButtonLabel(scan.isPending, results.length > 0)}
      </Button>

      {scan.isError && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not scan that image. Please try again.
        </p>
      )}

      {results.length > 0 && (
        <section className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-900">What are you feeling tonight?</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {VIBE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={vibe === opt}
                onClick={() => setVibe(vibe === opt ? null : opt)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  vibe === opt
                    ? 'border-brand-500 bg-brand-600 text-white'
                    : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-300'
                }`}
              >
                {t(`enums.vibe.${opt}.label`)}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={freeText}
            maxLength={200}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="e.g. something hoppy to pair with spicy food"
            className="mt-3 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none"
          />
          <Button
            className="mt-3"
            disabled={scan.isPending || vibe === null || lastFile === null}
            onClick={() => lastFile && scan.mutate(scanArgs(lastFile, vibe, freeText))}
          >
            Re-rank for tonight
          </Button>
        </section>
      )}

      {results.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {results.map((row, index) => (
            <li
              key={`${row.raw_text}-${index}`}
              className={`flex items-center justify-between gap-3 rounded border p-4 ${
                row.matched_id ? 'border-brand-400 bg-brand-50' : 'border-neutral-200 bg-neutral-50'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{row.name ?? row.raw_text}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {row.matched_id
                    ? `${Math.round(row.confidence * 100)}% match${row.needs_review ? ' · please confirm' : ''}`
                    : 'Not in our catalog — skipped'}
                </p>
              </div>
              {row.taste_fit != null && (
                <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
                  {Math.round(row.taste_fit * 100)}% your taste
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <Link
        to="/"
        className="mt-6 text-center text-xs text-neutral-400 underline hover:text-neutral-600"
      >
        Back to home
      </Link>
    </main>
  )
}
