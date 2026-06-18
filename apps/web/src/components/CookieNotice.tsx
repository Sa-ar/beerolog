import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const ACK_KEY = 'cookie_notice_ack'

// Non-blocking first-visit disclosure. A region (not a modal) so it never
// blocks essential site function; dismissal is remembered in localStorage.
export function CookieNotice() {
  const { t } = useTranslation()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (localStorage.getItem(ACK_KEY) !== '1') setShow(true)
  }, [])

  if (!show) return null

  function dismiss() {
    localStorage.setItem(ACK_KEY, '1')
    setShow(false)
  }

  return (
    <div
      role="region"
      aria-label={t('cookies.notice.label')}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-amber-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur sm:px-6"
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
          className="rounded-lg bg-amber-700 px-3 py-1.5 font-medium text-white hover:bg-amber-800"
        >
          {t('cookies.notice.dismiss')}
        </button>
      </div>
    </div>
  )
}
