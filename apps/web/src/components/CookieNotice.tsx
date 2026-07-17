import { useAuth } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

const ACK_KEY = 'cookie_notice_ack'

// Non-blocking first-visit disclosure. A region (not a modal) so it never
// blocks essential site function; dismissal is remembered in localStorage.
export function CookieNotice() {
  const { t } = useTranslation()
  const { isSignedIn } = useAuth()
  const [show, setShow] = useState(false)
  const bannerRef = useRef<HTMLDivElement>(null)
  // Reserve flow space equal to the fixed banner so it never overlaps the
  // footer's legal links (this component renders right after <footer>).
  const [reserve, setReserve] = useState(0)

  useEffect(() => {
    if (localStorage.getItem(ACK_KEY) !== '1') setShow(true)
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

  function dismiss() {
    localStorage.setItem(ACK_KEY, '1')
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
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg bg-brand-500 px-3 py-1.5 font-medium text-[hsl(26_30%_10%)] hover:bg-brand-600"
          >
            {t('cookies.notice.dismiss')}
          </button>
        </div>
      </div>
    </>
  )
}
