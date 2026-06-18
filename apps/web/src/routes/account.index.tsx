import { createFileRoute, redirect } from '@tanstack/react-router'

// /account lands on the first tab.
export const Route = createFileRoute('/account/')({
  beforeLoad: () => {
    throw redirect({ to: '/account/profile' })
  },
})
