import { apiFetch } from './api-fetch'
import type { BaselineTaste } from './baseline-taste'
import type { BaselineLoadErrorReason } from './user-facing-errors'

export type { BaselineLoadErrorReason } from './user-facing-errors'
export { describeBaselineLoadError } from './user-facing-errors'

export type LoadBaselineResult =
  | { status: 'ready'; baseline: BaselineTaste }
  | { status: 'empty' }
  | { status: 'error'; reason: BaselineLoadErrorReason }

export async function loadBaselineTaste(getToken: () => Promise<string | null>): Promise<LoadBaselineResult> {
  const token = await getToken()
  if (!token) {
    return { status: 'error', reason: 'unauthorized' }
  }

  try {
    const res = await apiFetch('/me/baseline-taste')
    if (res.status === 404) return { status: 'empty' }
    if (res.status === 401) return { status: 'error', reason: 'unauthorized' }
    if (res.status >= 500) return { status: 'error', reason: 'server' }
    if (!res.ok) return { status: 'error', reason: 'unknown' }

    const baseline = (await res.json()) as BaselineTaste
    return { status: 'ready', baseline }
  } catch {
    return { status: 'error', reason: 'network' }
  }
}
