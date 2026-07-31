import { RedirectToSignIn, Show } from '@clerk/tanstack-react-start'
import { Outlet, createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Heading } from '@beerolog/ui'
import { PAGE_SHELL_X } from '@beerolog/shared'

export const Route = createFileRoute('/account')({
  component: AccountLayout,
})

function AccountLayout() {
  const { t } = useTranslation()
  return (
    <>
      <Show when="signed-out">
        <RedirectToSignIn />
      </Show>
      <Show when="signed-in">
        <main className={`${PAGE_SHELL_X} py-8`}>
          <Heading className="text-2xl">{t('account.title')}</Heading>
          <div className="mt-6">
            <Outlet />
          </div>
        </main>
      </Show>
    </>
  )
}
