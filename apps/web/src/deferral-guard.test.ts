import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// Deferral guard (#329): the page-reduction PRD explicitly ships NO Discover
// deck, novelty/explore slider, or draggable taste radar. This fails if any of
// those surfaces sneak in. Patterns are specific enough not to match the
// legitimate `novelty_affinity` dial or the read-only TasteRadar.
const FORBIDDEN = [
  /DiscoverDeck/,
  /DiscoverTab/,
  /novelty[-_]?slider/i,
  /explore[-_]?slider/i,
  /draggable[-_]?radar/i,
]

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) return walk(full)
    return full.endsWith('.ts') || full.endsWith('.tsx') ? [full] : []
  })
}

describe('page-reduction deferral guard (#329)', () => {
  it('ships no Discover / novelty-slider / draggable-radar code', () => {
    const files = walk('src').filter((f) => !f.endsWith('deferral-guard.test.ts'))
    const offenders: string[] = []
    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      for (const pattern of FORBIDDEN) {
        if (pattern.test(text)) offenders.push(`${file} :: ${pattern}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
