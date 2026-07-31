import { beforeEach, describe, expect, it } from 'vitest'
import {
  WANT_ARROW_KEYS_STORAGE_KEY,
  getWantArrowKeysPref,
  isWantArrowKeysEnabled,
  setWantArrowKeysPref,
} from './want-arrow-keys'

describe('want-arrow-keys preference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts unset, enables and disables via settings values', () => {
    expect(getWantArrowKeysPref()).toBe('unset')
    expect(isWantArrowKeysEnabled()).toBe(false)

    setWantArrowKeysPref('on')
    expect(getWantArrowKeysPref()).toBe('on')
    expect(isWantArrowKeysEnabled()).toBe(true)
    expect(localStorage.getItem(WANT_ARROW_KEYS_STORAGE_KEY)).toBe('1')

    setWantArrowKeysPref('off')
    expect(getWantArrowKeysPref()).toBe('off')
    expect(isWantArrowKeysEnabled()).toBe(false)
    expect(localStorage.getItem(WANT_ARROW_KEYS_STORAGE_KEY)).toBe('0')
  })
})
