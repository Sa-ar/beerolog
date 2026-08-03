import { describe, expect, it } from 'vitest'
import { safeNextPath } from './safe-next-path'

describe('safeNextPath', () => {
  it('accepts a root-relative path', () => {
    expect(safeNextPath('/recommendations')).toBe('/recommendations')
    expect(safeNextPath('/')).toBe('/')
  })

  it('rejects protocol-relative and backslash host tricks', () => {
    expect(safeNextPath('//evil.com')).toBeNull()
    expect(safeNextPath('/\\evil.com')).toBeNull()
  })

  it('rejects ASCII control characters that normalize to an external host', () => {
    expect(safeNextPath('/\t/evil.com')).toBeNull()
    expect(safeNextPath('/\n/evil.com')).toBeNull()
    expect(safeNextPath('/\r/evil.com')).toBeNull()
    expect(safeNextPath('/foo\u007f')).toBeNull()
  })

  it('rejects absolute URLs', () => {
    expect(safeNextPath('https://evil.com')).toBeNull()
    expect(safeNextPath('http://evil.com/path')).toBeNull()
  })

  it('rejects paths that do not start with a slash', () => {
    expect(safeNextPath('recommendations')).toBeNull()
    expect(safeNextPath('')).toBeNull()
  })

  it('rejects non-string values', () => {
    expect(safeNextPath(undefined)).toBeNull()
    expect(safeNextPath(42)).toBeNull()
    expect(safeNextPath(null)).toBeNull()
  })
})
