import { useUser } from '@clerk/tanstack-react-start'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button, Card, CardContent, CardHeader } from '@beerolog/ui'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const signedIn = isLoaded && isSignedIn

  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-amber-900">🍺 Beerolog</h1>
        <p className="mt-3 max-w-xs text-lg text-neutral-600">
          Stop guessing. Find the perfect beer for you — and your group.
        </p>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <h2 className="text-xl font-semibold text-neutral-900">
            {signedIn ? 'Pick up where you left off' : 'Ready to find your beer?'}
          </h2>
          <p className="text-sm text-neutral-500">
            {signedIn
              ? 'Head to your profile or retake the taste quiz for fresh recommendations.'
              : '6 quick questions. Sign in to save your taste profile and recommendations.'}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {signedIn && (
              <Link to="/profile">
                <Button className="w-full" size="lg">
                  Open my profile →
                </Button>
              </Link>
            )}
            <Link to="/quiz">
              <Button className="w-full" size={signedIn ? 'md' : 'lg'} variant={signedIn ? 'outline' : 'default'}>
                {signedIn ? 'Retake the quiz' : 'Start the quiz →'}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
      {!isLoaded && (
        <p className="text-sm text-neutral-400 animate-pulse">Loading session…</p>
      )}
    </main>
  )
}
