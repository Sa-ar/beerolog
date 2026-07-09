import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useSwipeCard } from './use-swipe-card'

// Synthetic pointer event: jsdom's PointerEvent doesn't carry clientX/clientY,
// so we drive the handlers directly — the pure geometry is covered in
// swipe-rating.test.ts.
function ev(clientX: number, clientY: number, tag = 'div') {
  return {
    clientX,
    clientY,
    pointerId: 1,
    target: document.createElement(tag),
    currentTarget: { setPointerCapture: () => {} },
  } as unknown as React.PointerEvent
}

function swipe(
  onCommit: (r: string) => void,
  to: { x: number; y: number },
  opts: { downTag?: string } = {},
) {
  const { result } = renderHook(() => useSwipeCard(onCommit as never))
  act(() => result.current.handlers.onPointerDown(ev(0, 0, opts.downTag ?? 'div')))
  act(() => result.current.handlers.onPointerMove(ev(to.x, to.y)))
  act(() => result.current.handlers.onPointerUp())
}

describe('useSwipeCard', () => {
  it('commits loved on a rightward swipe past the threshold', () => {
    const onCommit = vi.fn()
    swipe(onCommit, { x: 150, y: 5 })
    expect(onCommit).toHaveBeenCalledWith('loved')
  })

  it('commits unknown on a downward swipe past the threshold', () => {
    const onCommit = vi.fn()
    swipe(onCommit, { x: 5, y: 150 })
    expect(onCommit).toHaveBeenCalledWith('unknown')
  })

  it('snaps back without committing under the threshold', () => {
    const onCommit = vi.fn()
    swipe(onCommit, { x: 20, y: 0 })
    expect(onCommit).not.toHaveBeenCalled()
  })

  it('ignores drags that start on an interactive control', () => {
    const onCommit = vi.fn()
    swipe(onCommit, { x: 150, y: 0 }, { downTag: 'button' })
    expect(onCommit).not.toHaveBeenCalled()
  })
})
