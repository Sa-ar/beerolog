/**
 * Runnable check for seededVec (ponytail rule: non-trivial math leaves one
 * check behind). No framework — plain node:assert.
 *
 *   pnpm --dir packages/db db:check
 */
import assert from 'node:assert/strict'
import { seededVec } from './seed_dev'

const a = seededVec('goldstar')
const b = seededVec('goldstar')
const c = seededVec('maccabee')

assert.deepEqual(a, b, 'same seed must produce the same vector (idempotent re-seed)')
assert.notDeepEqual(a, c, 'different seeds must produce different vectors')
assert.equal(a.length, 1536, 'default dim must be 1536 (matches vector(1536) columns)')

const norm = Math.sqrt(a.reduce((s, x) => s + x * x, 0))
assert.ok(Math.abs(norm - 1) < 1e-9, `expected a unit vector, got ‖v‖=${norm}`)

console.log('seededVec check: ok')
