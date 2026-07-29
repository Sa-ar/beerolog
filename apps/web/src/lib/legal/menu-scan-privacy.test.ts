import { describe, expect, it } from 'vitest'
import en from '../../i18n/locales/en/common.json'
import he from '../../i18n/locales/he/common.json'

// #154: the menu-scan photo path is verified in code (menu_scanner sends the
// image to OpenAI vision, not stored); the privacy copy must state that
// accurately and the sub-processor list must name the menu-scan use.
const section = (j: typeof en, needle: string) =>
  j.legal.privacy.sections.find((s) => s.body.includes(needle))

describe('menu-scan privacy wording (#154)', () => {
  it('states the photo is sent to OpenAI, not stored (en)', () => {
    const body = section(en, 'scan a bar menu')?.body ?? ''
    expect(body).toMatch(/sent to our inference provider \(OpenAI\)/i)
    expect(body).toMatch(/we do not store it/i)
  })
  it('names menu-scan in the OpenAI sub-processor entry (en)', () => {
    const subs = section(en, 'We share data with')?.body ?? ''
    expect(subs).toMatch(/menu-scan text extraction/i)
  })
  it('finalizes the Hebrew menu-scan wording', () => {
    const body = he.legal.privacy.sections.find((s) => s.body.includes('סורק תפריט'))?.body ?? ''
    expect(body).toContain('נשלחת לספק ההסקה')
  })
})
