import { createFileRoute, notFound } from '@tanstack/react-router'
import { LegalPage } from '../components/LegalPage'
import { LEGAL_SLUGS, type LegalSlug } from '../lib/legal/registry'

export const Route = createFileRoute('/legal/$slug')({
  beforeLoad: ({ params }) => {
    if (!LEGAL_SLUGS.includes(params.slug as LegalSlug)) throw notFound()
  },
  component: LegalRoute,
})

function LegalRoute() {
  const { slug } = Route.useParams()
  return <LegalPage slug={slug as LegalSlug} />
}
