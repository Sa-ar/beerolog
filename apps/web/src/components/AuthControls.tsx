import { Show } from '@clerk/tanstack-react-start'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { UserMenu } from './UserMenu'

export function AuthControls() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <Link
          to="/signup/$"
          params={{ _splat: '' }}
          className="hidden min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-amber-800 hover:bg-amber-100 sm:inline-flex"
        >
          {t('auth.signUp')}
        </Link>
        <Link
          to="/signin/$"
          params={{ _splat: '' }}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-700 px-4 text-sm font-semibold text-white hover:bg-amber-800"
        >
          {t('auth.signIn')}
        </Link>
      </Show>
      <Show when="signed-in">
        <UserMenu />
      </Show>
    </div>
  )
}
