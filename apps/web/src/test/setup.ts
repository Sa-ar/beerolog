import '@testing-library/jest-dom/vitest'

// jsdom here exposes an incomplete localStorage; install a working in-memory
// Storage so components using Web Storage are testable.
if (typeof localStorage === 'undefined' || typeof localStorage.clear !== 'function') {
  class MemoryStorage {
    private store = new Map<string, string>()
    get length() {
      return this.store.size
    }
    clear() {
      this.store.clear()
    }
    getItem(key: string) {
      return this.store.has(key) ? (this.store.get(key) as string) : null
    }
    setItem(key: string, value: string) {
      this.store.set(key, String(value))
    }
    removeItem(key: string) {
      this.store.delete(key)
    }
    key(index: number) {
      return Array.from(this.store.keys())[index] ?? null
    }
  }
  Object.defineProperty(globalThis, 'localStorage', {
    value: new MemoryStorage(),
    configurable: true,
  })
}
