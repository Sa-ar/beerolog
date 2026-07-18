import { useClerk, useUser } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

type UserMenuProps = {
  /** When `up`, menu opens above the trigger and shows name/email (sidebar footer). */
  menuPlacement?: 'down' | 'up'
}

// Branded replacement for Clerk's default <UserButton />. Avatar opens Account +
// Sign out; account tabs live only in the /account shell.
export function UserMenu({ menuPlacement = 'down' }: UserMenuProps) {
  const { t } = useTranslation()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-neutral-900">{name}</p>
            {email && <p className="truncate text-xs text-neutral-500">{email}</p>}
          </div>
          <Link
            to="/account/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2 text-sm text-neutral-700 hover:bg-white/5"
          >
            {t('menu.accountLink')}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              void signOut()
            }}
            className="block w-full border-t border-neutral-100 px-4 py-2 text-start text-sm text-red-600 hover:bg-red-50"
          >
            {t('menu.logout')}
          </button>
        </div>
      )}
    </div>
  )
}
