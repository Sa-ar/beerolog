/**
 * /taste/$key — public, shareable archetype page (slice #287). Renders the
 * ArchetypeCard (reveal variant) + a prominent "take the quiz" CTA, locale-aware.
 * Unknown key → 404. Emits OG + Twitter meta (rendered by <HeadContent /> in
 * __root) pointing at the slice-4 `size=og` image so pasted links get a rich
 * preview instead of bare text.
 */
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@beerolog/ui'
import { ArchetypeCard } from '../components/ArchetypeCard'
import { capture } from '../lib/analytics'
import {
  archetypeNameKey,
  archetypeTaglineKey,
  isArchetypeKey,
  type ArchetypeKey,
} from '../lib/archetypes'
import { createI18n } from '../i18n'
import { getLang } from '../i18n/locale-cookie'
import { PAGE_MAIN } from '../lib/page-shell'

// OG tags need absolute URLs. Default to the canonical prod domain; override per
// environment with VITE_WEB_URL. ponytail: the image is deterministic by key, so
// pointing previews at the prod image endpoint is fine for the MVP loop.
const SITE_URL = (import.meta.env.VITE_WEB_URL as string | undefined) ?? 'https://beerolog.com'

export const Route = createFileRoute('/taste/$key')({
  beforeLoad: ({ params }) => {
    if (!isArchetypeKey(params.key)) throw notFound()
  },
  head: ({ params }) => {
    if (!isArchetypeKey(params.key)) return {}
    const key = params.key
    const lang = getLang()
    // Resolve localized meta copy server-side (no react context in head()).
    const t = createI18n(lang).getFixedT(lang)
    const name = t(archetypeNameKey(key))
    const tagline = t(archetypeTaglineKey(key))
    const title = `${name} · Beerolog`
    const pageUrl = `${SITE_URL}/taste/${key}`
    const imageUrl = `${SITE_URL}/api/og/taste/${key}?size=og&lang=${lang}`
    return {
      meta: [
        { title },
        { name: 'description', content: tagline },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: title },
        { property: 'og:description', content: tagline },
        { property: 'og:url', content: pageUrl },
        { property: 'og:image', content: imageUrl },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: tagline },
        { name: 'twitter:image', content: imageUrl },
      ],
    }
  },
  component: TasteShareRoute,
})

function TasteShareRoute() {
  const { key } = Route.useParams()
  return <TasteShareView archetypeKey={key as ArchetypeKey} />
}

// Extracted so it can be tested without a router context.
export function TasteShareView({ archetypeKey }: { archetypeKey: ArchetypeKey }) {
  const { t } = useTranslation()
  return (
    <main className={`${PAGE_MAIN} py-8 sm:py-10`}>
      <div className="mx-auto flex max-w-md flex-col items-center gap-6">
        <ArchetypeCard archetypeKey={archetypeKey} variant="reveal" />
        <div className="flex flex-col items-center gap-2 text-center">
          <Link
            to="/try"
            search={{ from: 'share' }}
            onClick={() => capture('cta_click', { key: archetypeKey, target: 'try' })}
          >
            <Button size="lg">{t('tasteShare.cta')}</Button>
          </Link>
          <p className="text-sm text-neutral-600">{t('tasteShare.ctaHint')}</p>
        </div>
      </div>
    </main>
  )
}
