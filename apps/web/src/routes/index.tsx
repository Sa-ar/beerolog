import { createRoute, Link } from '@tanstack/react-router'
import { Route as rootRoute } from './__root'
import { Button, Card, CardContent, CardHeader } from '@beerolog/ui'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
})

function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6 bg-gradient-to-b from-amber-50 to-white">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-amber-900">🍺 Beerolog</h1>
        <p className="mt-3 text-lg text-neutral-600 max-w-xs">
          Stop guessing. Find the perfect beer for you — and your group.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <h2 className="text-xl font-semibold text-neutral-900">Ready to find your beer?</h2>
          <p className="text-sm text-neutral-500">6 quick questions. No beer knowledge required.</p>
        </CardHeader>
        <CardContent>
          <Link to="/quiz">
            <Button className="w-full" size="lg">
              Start the quiz →
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  )
}
