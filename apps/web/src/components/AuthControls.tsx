import { Show, SignInButton } from '@clerk/tanstack-react-start'
import { useTranslation } from 'react-i18next'
import { UserMenu } from './UserMenu'

export function AuthControls() {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            type="button"
            className="rounded-lg bg-amber-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-800"
          >
            {t('auth.signIn')}
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <UserMenu />
      </Show>
    </div>
  )
}
