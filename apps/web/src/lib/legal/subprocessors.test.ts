import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en/common.json'
import he from '../../i18n/locales/he/common.json'

// #155: Vercel Web Analytics + Speed Insights are live (mounted in __root) and
// must be disclosed. They are cookieless, so the disclosure lives in the privacy
// sub-processor list and the cookie policy — not the cookie registry.
const vercelPrivacySection = (j: typeof en) =>
  j.legal.privacy.sections.find((s) => s.body.includes('Vercel'))
const nonEssentialCookieSection = (j: typeof en) =>
  j.legal.cookies.sections.find((s) => /non-essential|לא חיוני/i.test(s.heading))

describe('Vercel analytics disclosure (#155)', () => {
  it('discloses Vercel cookieless web analytics in the English sub-processor list', () => {
    expect(vercelPrivacySection(en)?.body).toMatch(/cookieless web analytics/i)
  })
  it('discloses Vercel analytics in the Hebrew sub-processor list', () => {
    expect(vercelPrivacySection(he)?.body).toContain('ללא עוגיות')
  })
  it('clarifies Vercel analytics is cookieless in the English cookie policy', () => {
    expect(nonEssentialCookieSection(en)?.body).toMatch(/vercel web analytics/i)
  })
  it('clarifies Vercel analytics is cookieless in the Hebrew cookie policy', () => {
    expect(nonEssentialCookieSection(he)?.body).toContain('Vercel Web Analytics')
  })
})
