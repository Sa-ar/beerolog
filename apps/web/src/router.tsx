import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { Route as rootRoute } from './routes/__root'
import { Route as IndexRoute } from './routes/index'
import { Route as QuizRoute } from './routes/quiz'
import { Route as ResultsRoute } from './routes/results'
import { Route as VenueTapListRoute } from './routes/venue-tap-list'
import { Route as VenueManageRoute } from './routes/venue-manage'
import { Route as ScanRoute } from './routes/scan'
import { Route as GroupRoute } from './routes/group'
import { Route as GroupSessionRoute } from './routes/group-session'
import { Route as GroupResultRoute } from './routes/group-result'
import { Route as ChallengeRoute } from './routes/challenge'
import { Route as SignInRoute } from './routes/signin'
import { Route as AuthCallbackRoute } from './routes/auth-callback'
import { Route as ProfileRoute } from './routes/profile'
import { Route as VenueLeaderboardRoute } from './routes/venue-leaderboard'

const routeTree = rootRoute.addChildren([
  IndexRoute,
  QuizRoute,
  ResultsRoute,
  VenueTapListRoute,
  VenueManageRoute,
  ScanRoute,
  GroupRoute,
  GroupSessionRoute,
  GroupResultRoute,
  ChallengeRoute,
  SignInRoute,
  AuthCallbackRoute,
  ProfileRoute,
  VenueLeaderboardRoute,
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
