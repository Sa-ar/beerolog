import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as IndexRoute } from './routes/index'
import { Route as QuizRoute } from './routes/quiz'
import { Route as ResultsRoute } from './routes/results'
import { Route as ChallengeRoute } from './routes/challenge'
import { Route as SignInRoute } from './routes/signin'
import { Route as AuthCallbackRoute } from './routes/auth-callback'
import { Route as ProfileRoute } from './routes/profile'

const routeTree = rootRoute.addChildren([
  IndexRoute,
  QuizRoute,
  ResultsRoute,
  ChallengeRoute,
  SignInRoute,
  AuthCallbackRoute,
  ProfileRoute,
])

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
