import { useClerk, useUser } from '@clerk/tanstack-react-start'
import { Link, useRouterState } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert } from '@beerolog/ui'
import { ACCOUNT_NAV } from '../lib/account-nav'

type UserMenuProps = {
  /** When `up`, menu opens above the trigger; name/email live on the trigger only. */
  menuPlacement?: 'down' | 'up'
}

// Avatar menu lists every account destination + Sign out. No secondary account navbar.
export function UserMenu({ menuPlacement = 'down' }: UserMenuProps) {
  const { t } = useTranslation()
  const { user } = useUser()
  const { signOut } = useClerk()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [open, setOpen] = useState(false)
  const [signOutFailed, setSignOutFailed] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  // In-flight guard: a second click while sign-out is pending must not fire a
  // second request (whose outcome could race the first and leave stale state).
  const signingOut = useRef(false)

  useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!user) return null

  const name = user.fullName ?? user.username ?? user.primaryEmailAddress?.emailAddress ?? ''
  const email = user.primaryEmailAddress?.emailAddress ?? ''
  const initials = (user.firstName?.[0] ?? name[0] ?? '?').toUpperCase()
  const showDetails = menuPlacement === 'up'
  const detailEmail = email && email !== name ? email : ''

  // A swallowed sign-out rejection would leave the user believing they're signed
  // out when they aren't. Surface the failure and keep a retry path instead.
  async function handleSignOut() {
    if (signingOut.current) return
    signingOut.current = true
    setSignOutFailed(false)
    try {
      await signOut()
      setOpen(false)
    } catch {
      // Close the menu and surface the error outside it (a menu must only
      // contain menu items), keeping a retry path via the Alert.
      setOpen(false)
      setSignOutFailed(true)
    } finally {
      signingOut.current = false
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('menu.account')}
        className={
          showDetails
            ? 'flex w-full min-h-11 items-center gap-3 rounded-lg px-2 text-start text-brand-200/90 transition-colors hover:bg-white/5 hover:text-brand-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
            : 'flex items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500'
        }
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber-700 text-sm font-semibold text-[#fff]">
          {user.hasImage ? (
            <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
        </span>
        {showDetails && (name || detailEmail) ? (
          <span className="min-w-0 flex-1">
            {name ? (
              <span className="block truncate text-sm font-semibold">{name}</span>
            ) : null}
            {detailEmail ? (
              <span className="block truncate text-xs text-brand-200/70">{detailEmail}</span>
            ) : null}
          </span>
        ) : null}
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute z-20 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg ${
            menuPlacement === 'up'
              ? 'bottom-full start-0 mb-2'
              : 'end-0 top-full mt-2'
          }`}
        >
          {!showDetails ? (
            <div className="border-b border-neutral-100 px-4 py-3">
              <p className="truncate text-sm font-semibold text-neutral-900">{name}</p>
              {email ? <p className="truncate text-xs text-neutral-500">{email}</p> : null}
            </div>
          ) : null}
          {ACCOUNT_NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`)
            return (
              <Link
                key={item.key}
                to={item.to}
                role="menuitem"
                aria-current={active ? 'page' : undefined}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors hover:bg-neutral-100 ${
                  active
                    ? 'bg-brand-50 font-semibold text-brand-800 hover:bg-brand-100'
                    : 'text-neutral-700'
                }`}
              >
                {t(`account.tabs.${item.key}`)}
              </Link>
            )
          })}
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className="block w-full border-t border-neutral-100 px-4 py-2 text-start text-sm text-red-600 hover:bg-red-50"
          >
            {t('menu.logout')}
          </button>
        </div>
      )}
      {signOutFailed ? (
        <div
          className={`absolute z-30 w-56 ${
            menuPlacement === 'up' ? 'bottom-full start-0 mb-2' : 'end-0 top-full mt-2'
          }`}
        >
          <Alert variant="error" onRetry={handleSignOut} retryLabel={t('common.tryAgain')}>
            {t('menu.logoutError')}
          </Alert>
        </div>
      ) : null}
    </div>
  )
}
