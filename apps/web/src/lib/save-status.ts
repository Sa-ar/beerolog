/**
 * Shared state vocabulary for optimistic "save then confirm" flows
 * (e.g. rating a beer). Use the object rather than bare string literals so
 * the states are named in one place and typos are compile errors.
 */
export const SAVE_STATUS = {
  idle: 'idle',
  saving: 'saving',
  saved: 'saved',
  error: 'error',
} as const

export type SaveStatus = (typeof SAVE_STATUS)[keyof typeof SAVE_STATUS]
