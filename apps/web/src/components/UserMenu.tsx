import { useClerk, useUser } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

// Branded replacement for Clerk's default <UserButton />. Avatar trigger opens a
// menu that deep-links into each account tab plus a logout item.
// ponytail: ~50 lines of useState + a click-outside effect; no headless-menu dep
// for one menu. Add Radix only if we need typeahead/roving focus later.
const MENU_TABS = [
  { to: '/account/profile', key: 'profile' },
  { to: '/account/security', key: 'security' },
  { to: '/account/settings', key: 'settings' },
] as const

export function UserMenu() {
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('menu.account')}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-amber-700 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        {user.hasImage ? (
          <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
        >
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-neutral-900">{name}</p>
            {email && <p className="truncate text-xs text-neutral-500">{email}</p>}
          </div>
          {MENU_TABS.map((tab) => (
            <Link
              key={tab.key}
              to={tab.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-neutral-700 hover:bg-amber-50"
            >
              {t(`account.tabs.${tab.key}`)}
            </Link>
          ))}
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
