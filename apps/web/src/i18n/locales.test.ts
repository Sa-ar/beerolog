import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const LOCALES = ['en', 'he'] as const

/**
 * Find keys declared more than once within the same object. JSON.parse silently
 * keeps the last of duplicate keys, so this walks the raw text instead. Keys with
 * the same name in *different* objects are fine (each object has its own scope).
 */
function duplicateKeys(text: string): string[] {
  const dups: string[] = []
  const stack: { keys: Set<string>; obj: boolean }[] = []
  let i = 0
  let expectKey = false
  const n = text.length
  while (i < n) {
    const c = text[i]
    if (c === '"') {
      i++
      let s = ''
      while (i < n && text[i] !== '"') {
        if (text[i] === '\\') {
          s += text[i] + (text[i + 1] ?? '')
          i += 2
          continue
        }
        s += text[i]
        i++
      }
      i++ // closing quote
      const top = stack[stack.length - 1]
      if (top?.obj && expectKey) {
        if (top.keys.has(s)) dups.push(s)
        top.keys.add(s)
        expectKey = false
      }
      continue
    }
    if (c === '{') {
      stack.push({ keys: new Set(), obj: true })
      expectKey = true
      i++
      continue
    }
    if (c === '[') {
      stack.push({ keys: new Set(), obj: false })
      expectKey = false
      i++
      continue
    }
    if (c === '}' || c === ']') {
      stack.pop()
      expectKey = false
      i++
      continue
    }
    if (c === ',') {
      expectKey = Boolean(stack[stack.length - 1]?.obj)
      i++
      continue
    }
    if (c === ':') {
      expectKey = false
      i++
      continue
    }
    i++
  }
  return dups
}

describe('i18n locale files', () => {
  // Self-check: a broken detector must not pass the real-file assertions vacuously.
  it('duplicateKeys detects duplicates within an object only', () => {
    expect(duplicateKeys('{"a":1,"a":2}')).toEqual(['a'])
    expect(duplicateKeys('{"x":{"a":1,"a":2}}')).toEqual(['a'])
    expect(duplicateKeys('{"x":{"a":1},"y":{"a":2}}')).toEqual([])
    expect(duplicateKeys('{"a":1,"b":2}')).toEqual([])
  })

  it.each(LOCALES)('%s/common.json has no duplicate keys', (locale) => {
    const text = readFileSync(
      join(process.cwd(), 'src/i18n/locales', locale, 'common.json'),
      'utf8',
    )
    expect(duplicateKeys(text)).toEqual([])
  })
})
