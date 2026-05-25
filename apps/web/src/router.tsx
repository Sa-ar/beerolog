import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as IndexRoute } from './routes/index'
import { Route as QuizRoute } from './routes/quiz'
import { Route as ResultsRoute } from './routes/results'

const routeTree = rootRoute.addChildren([IndexRoute, QuizRoute, ResultsRoute])

export function createRouter() {
  return createTanStackRouter({
    routeTree,
    defaultPreload: 'intent',
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouter>
  }
}
