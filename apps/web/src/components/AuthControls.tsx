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
          className="hidden min-h-11 items-center justify-center rounded-lg px-3 text-sm font-semibold text-brand-200 hover:bg-white/5 sm:inline-flex"
        >
          {t('auth.signUp')}
        </Link>
        <Link
          to="/signin/$"
          params={{ _splat: '' }}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-500 px-4 text-sm font-semibold text-[hsl(26_30%_10%)] hover:bg-brand-600"
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
