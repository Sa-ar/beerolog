import { createFileRoute } from '@tanstack/react-router'
import { Button, Card, CardHeader, CardContent } from '@beerolog/ui'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <h1 className="text-4xl font-bold text-brand-900">Beerolog</h1>
      <p className="text-center text-lg text-neutral-600">
        Find the perfect beer for you and your group.
      </p>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <h2 className="text-xl font-semibold">Ready to find your beer?</h2>
          <p className="text-sm text-neutral-500">Takes about 2 minutes.</p>
        </CardHeader>
        <CardContent>
          <Button className="w-full" size="lg">
            Start the quiz
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
