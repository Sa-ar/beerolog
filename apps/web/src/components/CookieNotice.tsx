import { useAuth } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { updateAnalyticsConsent } from '../lib/analytics'
import { getAnalyticsConsent, type AnalyticsConsent } from '../lib/analytics-consent'

// Opt-in consent banner for analytics + session replay. A region (not a modal)
// so it never blocks the site; PostHog stays dormant until the user accepts.
// Shows only until a decision is recorded (analytics-consent.ts).
export function CookieNotice() {
  const { t } = useTranslation()
  const { isSignedIn } = useAuth()
  const [show, setShow] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)
  // Reserve flow space equal to the fixed banner so it never overlaps the
  // footer's legal links (this component renders right after <footer>).
  const [reserve, setReserve] = useState(0)

  useEffect(() => {
    if (getAnalyticsConsent() === null) setShow(true)
  }, [])

  useEffect(() => {
    const el = bannerRef.current
    if (!show || !el) return
    const update = () => setReserve(el.offsetHeight)
    update()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [show])

  if (!show) return null

  function decide(consent: AnalyticsConsent) {
    updateAnalyticsConsent(consent)
    setShow(false)
  }

  // On mobile, sit above the signed-in tab bar. Desktop has no bottom tabs.
  const bottomOffset = isSignedIn
    ? 'bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-0'
    : 'bottom-0'

  return (
    <>
      <div aria-hidden style={{ height: reserve }} />
      <div
        ref={bannerRef}
        role="region"
        aria-label={t('cookies.notice.label')}
        className={`fixed inset-x-0 z-40 border-t border-brand-700/50 bg-[hsl(26_24%_8%)]/95 px-4 py-3 shadow-lg backdrop-blur sm:px-6 ${bottomOffset}`}
      >
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-3 text-sm text-neutral-700">
          <p>
            {t('cookies.notice.body')}{' '}
            <Link to="/legal/$slug" params={{ slug: 'cookies' }} className="font-medium underline">
              {t('cookies.notice.learnMore')}
            </Link>
          </p>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => decide('denied')}
              className="rounded-lg px-3 py-1.5 font-medium text-neutral-500 hover:text-neutral-700"
            >
              {t('cookies.notice.decline')}
            </button>
            <button
              type="button"
              onClick={() => decide('granted')}
              className="rounded-lg bg-brand-500 px-3 py-1.5 font-medium text-[hsl(26_30%_10%)] hover:bg-brand-600"
            >
              {t('cookies.notice.accept')}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
