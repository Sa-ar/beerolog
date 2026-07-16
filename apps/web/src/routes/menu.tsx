/**
 * /menu — snap a tap-board photo, extract beer names via vision, and match them
 * to our catalog (POST /menu/scan). Signed-in only. Revived menu-scan tracer:
 * shows scan results; selection + continue-to-onboarding is a later slice.
 */

import { Button, Heading } from '@beerolog/ui'
import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useRef } from 'react'
import { PAGE_MAIN } from '../lib/page-shell'
import { useScanMenu } from '../lib/menu-scan'

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

function MenuScanFlow() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scan = useScanMenu()
  const results = scan.data ?? []

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
          if (file) scan.mutate(file)
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
        <ul className="mt-6 flex flex-col gap-3">
          {results.map((row, index) => (
            <li
              key={`${row.raw_text}-${index}`}
              className={`flex items-center justify-between gap-3 rounded border p-4 ${
                row.matched_id
                  ? 'border-brand-400 bg-brand-50'
                  : 'border-neutral-200 bg-neutral-50'
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
