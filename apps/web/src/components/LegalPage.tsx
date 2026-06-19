import { useTranslation } from 'react-i18next'
import type { LegalSlug } from '../lib/legal/registry'

interface LegalSection {
  heading: string
  body: string
}

// Renders one legal page (privacy/terms/cookies/accessibility) entirely from the
// i18n `legal.<slug>` content. Copy is draft until counsel approves.
export function LegalPage({ slug }: { slug: LegalSlug }) {
  const { t } = useTranslation()
  const sections = t(`legal.${slug}.sections`, { returnObjects: true })
  const list: LegalSection[] = Array.isArray(sections) ? (sections as LegalSection[]) : []

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <p className="mb-6 rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">
        {t('legal.draftNotice')}
      </p>
      <article>
        <h1 className="text-2xl font-bold text-neutral-900">{t(`legal.${slug}.title`)}</h1>
        <p className="mt-2 text-neutral-700">{t(`legal.${slug}.intro`)}</p>
        {list.map((section, i) => (
          <section key={i} className="mt-6">
            <h2 className="text-lg font-semibold text-neutral-900">{section.heading}</h2>
            <p className="mt-1 text-neutral-700">{section.body}</p>
          </section>
        ))}
        <p className="mt-8 text-sm text-neutral-500">{t('legal.lastUpdated')}</p>
      </article>
    </main>
  )
}
