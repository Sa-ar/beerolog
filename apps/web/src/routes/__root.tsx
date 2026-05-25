import { createRootRoute, Outlet, ScrollRestoration } from '@tanstack/react-router'
import '../styles.css'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <ScrollRestoration />
      <Outlet />
    </>
  )
}
