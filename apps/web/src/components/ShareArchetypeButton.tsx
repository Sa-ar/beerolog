import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@beerolog/ui'
import { capture } from '../lib/analytics'
import type { ArchetypeKey } from '../lib/archetypes'
import { normalizeLang } from '../i18n/locale-cookie'
import { shareArchetype } from '../lib/share-archetype'

// Primary "Share your type" action for the /try reveal and the signed-in home.
// Native share sheet (with the story image) on mobile; copy-link fallback else.
export function ShareArchetypeButton({
  archetypeKey,
  surface,
  className,
}: {
  archetypeKey: ArchetypeKey
  surface: 'try' | 'home'
  className?: string
}) {
  const { t, i18n } = useTranslation()
  const [copied, setCopied] = useState(false)
  const lang = normalizeLang(i18n.language)

  async function onShare() {
    const outcome = await shareArchetype({
      key: archetypeKey,
      lang,
      text: t('share.taste.text'),
    })
    // Numerator of the share → quiz-start K-factor: only count an actual share.
    if (outcome === 'shared' || outcome === 'copied') {
      capture('share_taste', { key: archetypeKey, method: outcome, surface })
    }
    if (outcome === 'copied') {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <Button
      type="button"
      size="lg"
      data-testid="share-archetype"
      className={className}
      onClick={() => void onShare()}
    >
      {copied ? t('share.taste.copied') : t('share.taste.cta')}
    </Button>
  )
}
