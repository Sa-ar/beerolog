/**
 * /menu — snap a photo of the menu, extract beer names via vision, rank every
 * beer on it by taste (POST /menu/scan), steer by tonight's direction, add
 * beers we missed via catalog search, and chat about the pick. Signed-in only.
 */

import { Button, Heading } from '@beerolog/ui'
import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { PAGE_MAIN } from '@beerolog/shared'
import { capture } from '../lib/analytics'
import {
  useMenuChat,
  useMenuRank,
  useScanMenu,
  type MenuChatMessage,
  type MenuChatPoolBeer,
  type MenuScanResultItem,
  type MenuSessionIntent,
} from '../lib/menu-scan'
import {
  clearMenuScanCache,
  loadMenuScanCache,
  saveMenuScanCache,
} from '../lib/menu-scan-cache'
import { apiClient } from '../lib/api-client/client'
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

function formatAbv(abv: number): string {
  return `${Number(abv.toFixed(1))}%`
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
  const [results, setResults] = useState<MenuScanResultItem[]>([])
  const [cacheReady, setCacheReady] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [tonightOpen, setTonightOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [ranking, setRanking] = useState(false)

  const scan = useScanMenu()
  const chat = useMenuChat()
  const rankAdded = useMenuRank(addedIds, appliedSession)

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    const snap = loadMenuScanCache()
    if (snap) {
      setResults(snap.results)
      setAppliedSession(snap.appliedSession ?? undefined)
      setAddedIds(snap.addedIds)
      setDismissed(new Set(snap.dismissed))
      setVibe(snap.vibe)
      setFreeText(snap.freeText)
    }
    setCacheReady(true)
  }, [])

  // Persist resume snapshot whenever the board changes.
  useEffect(() => {
    if (!cacheReady) return
    if (results.length === 0) {
      clearMenuScanCache()
      return
    }
    saveMenuScanCache({
      results,
      appliedSession: appliedSession ?? null,
      addedIds,
      dismissed: [...dismissed],
      vibe,
      freeText,
    })
  }, [cacheReady, results, appliedSession, addedIds, dismissed, vibe, freeText])

  // Lock background scroll while a sheet is open on mobile.
  const sheetOpen = chatOpen || tonightOpen || addOpen
  useEffect(() => {
    if (!sheetOpen) return
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
  }, [sheetOpen])

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
  const hasResults = results.length > 0
  const busy = scan.isPending || ranking

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
    capture('menu_scanned', { has_vibe: vibe !== null, has_free_text: freeText.trim().length > 0 })
    scan.mutate(scanArgs(file, session), {
      onSuccess: (data) => setResults(data),
    })
  }

  /** Re-rank via photo re-scan when we still have the file; otherwise rank
   * matched catalog ids (resume-from-cache path). */
  async function applySession(session: MenuSessionIntent | undefined) {
    setAppliedSession(session)
    if (lastFile) {
      scan.mutate(scanArgs(lastFile, session), {
        onSuccess: (data) => setResults(data),
      })
      return
    }
    const matchedIds = results
      .map((r) => r.matched_id)
      .filter((id): id is string => typeof id === 'string')
    if (matchedIds.length === 0) return
    setRanking(true)
    try {
      const { data, error } = await apiClient.POST('/menu/rank', {
        body: { beer_ids: matchedIds, ...(session ? { session } : {}) },
      })
      if (error || !data) throw new Error('Menu rank failed')
      const byId = new Map(data.map((r) => [r.matched_id ?? r.raw_text, r]))
      setResults((prev) =>
        prev.map((row) => {
          if (!row.matched_id) return row
          return byId.get(row.matched_id) ?? row
        }),
      )
    } finally {
      setRanking(false)
    }
  }

  function reRank() {
    const session = sessionFor(vibe, freeText)
    void applySession(session)
    setTonightOpen(false)
  }

  function clearAppliedVibe() {
    setVibe(null)
    setFreeText('')
    void applySession(undefined)
  }

  function addBeer(beer: SearchBeer) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.delete(beer.id)
      return next
    })
    setAddedIds((prev) => (prev.includes(beer.id) ? prev : [...prev, beer.id]))
    setAddOpen(false)
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

  const scanLabel = scanButtonLabel(t, busy, hasResults)

  return (
    <main className={`${PAGE_MAIN} py-8 pb-28`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Heading className="text-2xl">{t('menu.title')}</Heading>
          {!hasResults && (
            <p className="mt-2 text-sm text-neutral-600">{t('menu.subtitle')}</p>
          )}
        </div>
        {hasResults && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {scanLabel}
          </Button>
        )}
      </div>

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

      {!hasResults && (
        <Button
          className="mt-6"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {scanLabel}
        </Button>
      )}

      {scan.isError && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
          {t('menu.scanError')}
        </p>
      )}

      {hasResults && (
        <div className="sticky top-0 z-10 mt-4 -mx-4 border-b border-neutral-200 bg-white/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {appliedSession?.vibe && (
              <button
                type="button"
                onClick={clearAppliedVibe}
                aria-label={t('menu.clearVibe', {
                  vibe: t(`enums.vibe.${appliedSession.vibe}.label`),
                })}
                className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-brand-500 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-800"
              >
                {t(`enums.vibe.${appliedSession.vibe}.label`)}
                <span aria-hidden>×</span>
              </button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAddOpen(false)
                setTonightOpen(true)
              }}
            >
              {t('menu.refine')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-neutral-700 hover:bg-neutral-100"
              onClick={() => {
                setTonightOpen(false)
                setAddOpen(true)
              }}
            >
              {t('menu.addBeer')}
            </Button>
          </div>
        </div>
      )}

      {comparison.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3">
          {comparison.map((row, index) => {
            const title = row.name ?? row.raw_text
            const meta = row.matched_id
              ? [
                  row.brewery,
                  row.style,
                  row.abv != null ? formatAbv(row.abv) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : t('menu.notInCatalog')
            const body = (
              <>
                <p className="text-sm font-medium text-neutral-900 underline-offset-2 group-hover:underline">
                  {title}
                </p>
                <p className="mt-1 text-xs text-neutral-500">{meta}</p>
              </>
            )
            return (
              <li
                key={`${dismissKey(row)}-${index}`}
                className={`flex items-center justify-between gap-3 rounded border p-4 ${
                  row.matched_id
                    ? 'border-brand-400 bg-brand-50'
                    : 'border-neutral-200 bg-neutral-50'
                } ${
                  highlighted.includes(row.matched_id ?? row.raw_text)
                    ? 'ring-2 ring-brand-500'
                    : ''
                }`}
              >
                {row.matched_id ? (
                  <Link
                    to="/beer/$id"
                    params={{ id: row.matched_id }}
                    aria-label={t('menu.openBeer', { name: title })}
                    className="group min-w-0 flex-1 cursor-pointer"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="min-w-0 flex-1">{body}</div>
                )}
                <div className="flex shrink-0 items-center gap-2">
                  {row.taste_fit != null && (
                    <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white">
                      {t('menu.tasteBadge', { pct: Math.round(row.taste_fit * 100) })}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={t('menu.remove', { name: title })}
                    title={t('menu.notThisOne')}
                    onClick={() => setDismissed((prev) => new Set(prev).add(dismissKey(row)))}
                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
                  >
                    ✕
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <MenuSheetShell
        open={tonightOpen}
        onClose={() => setTonightOpen(false)}
        ariaLabel={t('menu.tonight')}
      >
        <p className="text-sm font-medium text-neutral-900">{t('menu.tonight')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {VIBE_OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              aria-pressed={vibe === opt}
              onClick={() => setVibe(vibe === opt ? null : opt)}
              className={`cursor-pointer rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
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
          className="mt-4 w-full"
          disabled={busy || vibe === null}
          onClick={reRank}
        >
          {t('menu.rerank')}
        </Button>
      </MenuSheetShell>

      <MenuSheetShell
        open={addOpen}
        onClose={() => setAddOpen(false)}
        ariaLabel={t('menu.addTitle')}
      >
        <AddBeerSearch inComparison={inComparison} onAdd={addBeer} />
      </MenuSheetShell>

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

function MenuSheetShell({
  open,
  onClose,
  ariaLabel,
  children,
}: {
  open: boolean
  onClose: () => void
  ariaLabel: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-pointer bg-black/50"
        aria-label={t('common.close')}
        onClick={onClose}
      />
      <div className="relative max-h-[85dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 shadow-2xl md:max-h-[min(90dvh,40rem)] md:max-w-2xl md:rounded-2xl md:p-5">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-neutral-300 md:hidden" aria-hidden />
        {children}
      </div>
    </div>
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
    <div>
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
                  className={`cursor-pointer shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
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
    </div>
  )
}
