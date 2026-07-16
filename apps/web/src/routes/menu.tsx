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
import {
  useMenuChat,
  useScanMenu,
  type MenuChatMessage,
  type MenuChatPoolBeer,
} from '../lib/menu-scan'
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
  const [messages, setMessages] = useState<MenuChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [highlighted, setHighlighted] = useState<string[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const scan = useScanMenu()
  const chat = useMenuChat()
  const results = scan.data ?? []

  // Stable id for a board line so a dismissal survives re-ranking.
  const dismissKey = (r: (typeof results)[number]) => r.matched_id ?? r.raw_text
  const visible = results.filter((r) => !dismissed.has(dismissKey(r)))

  // Every beer on the board is fair game to chat about, matched or not.
  const pool: MenuChatPoolBeer[] = visible.map((r) => ({
    id: r.matched_id ?? r.raw_text,
    name: r.name ?? r.raw_text,
    brewery: r.brewery ?? null,
    style: r.style ?? null,
    abv: r.abv ?? null,
    taste_fit: r.taste_fit ?? null,
  }))

  function runScan(file: File) {
    setLastFile(file)
    setMessages([])
    setHighlighted([])
    setDismissed(new Set())
    scan.mutate(scanArgs(file, vibe, freeText))
  }

  function sendChat() {
    const content = chatInput.trim()
    if (!content || chat.isPending) return
    const next: MenuChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next)
    setChatInput('')
    chat.mutate(
      { pool, messages: next },
      {
        onSuccess: (data) => {
          setMessages([...next, { role: 'assistant', content: data.reply }])
          setHighlighted(data.beer_ids)
        },
      },
    )
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

      {visible.length > 0 && (
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

      {visible.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {visible.map((row, index) => (
            <li
              key={`${row.raw_text}-${index}`}
              className={`flex items-center justify-between gap-3 rounded border p-4 ${
                row.matched_id ? 'border-brand-400 bg-brand-50' : 'border-neutral-200 bg-neutral-50'
              } ${
                highlighted.includes(row.matched_id ?? row.raw_text) ? 'ring-2 ring-brand-500' : ''
              }`}
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{row.name ?? row.raw_text}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {row.matched_id
                    ? [row.style, row.abv != null ? `${row.abv}%` : null]
                        .filter(Boolean)
                        .join(' · ')
                    : 'not in our catalog · ranked by name'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {row.taste_fit != null && (
                  <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
                    {Math.round(row.taste_fit * 100)}% your taste
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${row.name ?? row.raw_text}`}
                  title="Not this one"
                  onClick={() => setDismissed((prev) => new Set(prev).add(dismissKey(row)))}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pool.length > 0 && (
        <section className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-900">Ask about these beers</p>
          {messages.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {messages.map((m, i) => (
                <li
                  key={i}
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                    m.role === 'user'
                      ? 'self-end bg-brand-600 text-white'
                      : 'self-start bg-white text-neutral-900 border border-neutral-200'
                  }`}
                >
                  {m.content}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={chatInput}
              maxLength={300}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder="e.g. which is the most sessionable?"
              className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none"
            />
            <Button disabled={chat.isPending || chatInput.trim() === ''} onClick={sendChat}>
              {chat.isPending ? 'Thinking…' : 'Send'}
            </Button>
          </div>
          {chat.isError && (
            <p className="mt-2 text-xs text-red-700">Couldn&rsquo;t get a reply. Try again.</p>
          )}
        </section>
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
