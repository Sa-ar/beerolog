/**
 * /menu — snap a photo of the menu, extract beer names via vision, rank every
 * beer on it by taste (POST /menu/scan), steer by tonight's direction, add
 * beers we missed via catalog search, and chat about the pick. Signed-in only.
 */

import { Button, Heading } from '@beerolog/ui'
import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PAGE_MAIN } from '../lib/page-shell'
import {
  useMenuChat,
  useMenuRank,
  useScanMenu,
  type MenuChatMessage,
  type MenuChatPoolBeer,
  type MenuScanResultItem,
  type MenuSessionIntent,
} from '../lib/menu-scan'
import { useBeerSearch, type SearchBeer } from '../lib/rate-search'
import { useDebouncedValue } from '../lib/use-debounced-value'
import { VIBE_OPTIONS, type SessionVibe } from '../lib/session-intent'

export const Route = createFileRoute('/menu')({
  component: MenuPage,
})

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

// ponytail: vibe is the primary session lever; abv_intent stays 'any' so we
// don't add a second picker. Returns undefined when no vibe is set.
function sessionFor(vibe: SessionVibe | null, freeText: string): MenuSessionIntent | undefined {
  if (vibe === null) return undefined
  return { vibe, abv_intent: 'any', free_text: freeText.trim() }
}

function scanArgs(file: File, session: MenuSessionIntent | undefined) {
  return session ? { file, session } : { file }
}

function scanButtonLabel(t: (k: string) => string, pending: boolean, hasResults: boolean): string {
  if (pending) return t('menu.scanPending')
  return hasResults ? t('menu.scanAgain') : t('menu.scanIdle')
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
  const [addedIds, setAddedIds] = useState<string[]>([])
  const [appliedSession, setAppliedSession] = useState<MenuSessionIntent | undefined>(undefined)
  const [chatOpen, setChatOpen] = useState(false)

  const scan = useScanMenu()
  const chat = useMenuChat()
  const rankAdded = useMenuRank(addedIds, appliedSession)

  // Lock background scroll while the chat sheet is open on mobile; the desktop
  // docked panel leaves the page scrollable. Tracks the breakpoint live so a
  // resize/rotation across it toggles the lock without reopening.
  useEffect(() => {
    if (!chatOpen) return
    const mq = window.matchMedia('(max-width: 639px)')
    const prev = document.body.style.overflow
    const apply = () => {
      document.body.style.overflow = mq.matches ? 'hidden' : prev
    }
    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      document.body.style.overflow = prev
    }
  }, [chatOpen])

  const results = scan.data ?? []
  const added = rankAdded.data ?? []

  const dismissKey = (r: MenuScanResultItem) => r.matched_id ?? r.raw_text
  const scannedIds = new Set(results.map((r) => r.matched_id).filter((x): x is string => !!x))
  const visibleScanned = results.filter((r) => !dismissed.has(dismissKey(r)))
  const addedVisible = added.filter(
    (r) => !dismissed.has(dismissKey(r)) && !(r.matched_id && scannedIds.has(r.matched_id)),
  )
  // One comparison list: scanned + manually added, best taste-fit first.
  const comparison = [...visibleScanned, ...addedVisible].sort(
    (a, b) => (b.taste_fit ?? -1) - (a.taste_fit ?? -1),
  )
  const inComparison = new Set(comparison.map((r) => r.matched_id).filter((x): x is string => !!x))

  const pool: MenuChatPoolBeer[] = comparison.map((r) => ({
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
    setAddedIds([])
    const session = sessionFor(vibe, freeText)
    setAppliedSession(session)
    scan.mutate(scanArgs(file, session))
  }

  function reRank() {
    if (!lastFile) return
    const session = sessionFor(vibe, freeText)
    setAppliedSession(session)
    scan.mutate(scanArgs(lastFile, session))
  }

  function addBeer(beer: SearchBeer) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.delete(beer.id)
      return next
    })
    setAddedIds((prev) => (prev.includes(beer.id) ? prev : [...prev, beer.id]))
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

  const scanLabel = scanButtonLabel(t, scan.isPending, results.length > 0)

  return (
    <main className={`${PAGE_MAIN} py-8 pb-28`}>
      <Heading className="text-2xl">{t('menu.title')}</Heading>
      <p className="mt-2 text-sm text-neutral-600">{t('menu.subtitle')}</p>

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
        {scanLabel}
      </Button>

      {scan.isError && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t('menu.scanError')}
        </p>
      )}

      {results.length > 0 && (
        <section className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm font-medium text-neutral-900">{t('menu.tonight')}</p>
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
            placeholder={t('menu.freeTextPlaceholder')}
            className="mt-3 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none"
          />
          <Button
            className="mt-3"
            disabled={scan.isPending || vibe === null || lastFile === null}
            onClick={reRank}
          >
            {t('menu.rerank')}
          </Button>
        </section>
      )}

      <AddBeerSearch inComparison={inComparison} onAdd={addBeer} />

      {comparison.length > 0 && (
        <ul className="mt-6 flex flex-col gap-3">
          {comparison.map((row, index) => (
            <li
              key={`${dismissKey(row)}-${index}`}
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
                    : t('menu.notInCatalog')}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {row.taste_fit != null && (
                  <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
                    {t('menu.tasteBadge', { pct: Math.round(row.taste_fit * 100) })}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={t('menu.remove', { name: row.name ?? row.raw_text })}
                  title={t('menu.notThisOne')}
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

      {pool.length > 0 && !chatOpen && (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-brand-700"
        >
          <span aria-hidden>💬</span>
          <span className="hidden sm:inline">{t('menu.chatOpen')}</span>
        </button>
      )}

      {pool.length > 0 && chatOpen && (
        <button
          type="button"
          aria-label={t('menu.close')}
          onClick={() => setChatOpen(false)}
          className="fixed inset-0 z-20 bg-black/40 sm:hidden"
        />
      )}

      {pool.length > 0 && chatOpen && (
        <section className="fixed inset-x-4 bottom-4 z-30 flex max-h-[75vh] flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl sm:inset-x-auto sm:right-4 sm:w-96">
          <header className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <p className="text-sm font-medium text-neutral-900">{t('menu.chatTitle')}</p>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              aria-label={t('menu.close')}
              className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
            >
              ✕
            </button>
          </header>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {messages.map((m, i) => (
                  <li
                    key={i}
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'self-end bg-brand-600 text-white'
                        : 'self-start border border-neutral-200 bg-white text-neutral-900'
                    }`}
                  >
                    {m.content}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-neutral-500">{t('menu.chatHint')}</p>
            )}
          </div>
          <div className="flex gap-2 border-t border-neutral-200 p-3">
            <input
              type="text"
              value={chatInput}
              maxLength={300}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChat()}
              placeholder={t('menu.chatPlaceholder')}
              className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none"
            />
            <Button disabled={chat.isPending || chatInput.trim() === ''} onClick={sendChat}>
              {chat.isPending ? t('menu.thinking') : t('menu.send')}
            </Button>
          </div>
          {chat.isError && <p className="px-3 pb-3 text-xs text-red-700">{t('menu.chatError')}</p>}
        </section>
      )}

      <Link
        to="/"
        className="mt-6 text-center text-xs text-neutral-400 underline hover:text-neutral-600"
      >
        {t('menu.back')}
      </Link>
    </main>
  )
}

function AddBeerSearch({
  inComparison,
  onAdd,
}: {
  inComparison: Set<string>
  onAdd: (beer: SearchBeer) => void
}) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query.trim(), 250)
  const search = useBeerSearch(debounced)
  const results = search.data ?? []

  return (
    <section className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
      <p className="text-sm font-medium text-neutral-900">{t('menu.addTitle')}</p>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('menu.addPlaceholder')}
        className="mt-3 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-brand-500 focus:outline-none"
      />
      {results.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {results.map((b) => {
            const already = inComparison.has(b.id)
            return (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 rounded border border-neutral-200 bg-white px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm text-neutral-900">
                  {b.name} <span className="text-neutral-500">· {b.brewery}</span>
                </span>
                <button
                  type="button"
                  disabled={already}
                  onClick={() => {
                    onAdd(b)
                    setQuery('')
                  }}
                  className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                    already
                      ? 'border-neutral-200 text-neutral-400'
                      : 'border-brand-500 bg-brand-600 text-white hover:bg-brand-700'
                  }`}
                >
                  {already ? t('menu.added') : t('menu.add')}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
