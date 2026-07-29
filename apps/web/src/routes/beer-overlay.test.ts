import { describe, expect, it } from 'vitest'
import { ownerOverlayTaste } from './beer.$id'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseline = { bitterness: 0.8, abv_affinity: 0.3, novelty_affinity: 0.6 } as any

describe('ownerOverlayTaste (#275)', () => {
  it('maps a ready baseline to the radar overlay dials', () => {
    expect(ownerOverlayTaste({ status: 'ready', baseline })).toEqual({
      bitterness: 0.8,
      abv_affinity: 0.3,
      novelty_affinity: 0.6,
    })
  })

  it('stays objective (null) when signed-out / no profile / error', () => {
    expect(ownerOverlayTaste(undefined)).toBeNull()
    expect(ownerOverlayTaste({ status: 'empty' })).toBeNull()
    expect(ownerOverlayTaste({ status: 'error', reason: 'unauthorized' })).toBeNull()
  })
})
