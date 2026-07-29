import type { TFunction } from 'i18next'

export type BaselineLoadErrorReason = 'network' | 'unauthorized' | 'server' | 'unknown'

export function describeBaselineLoadError(
  t: TFunction,
  reason: BaselineLoadErrorReason,
): { title: string; message: string } {
  return {
    title: t(`errors.baselineLoad.${reason}.title`),
    message: t(`errors.baselineLoad.${reason}.message`),
  }
}

// A raw server error message (already localized by the API) wins; otherwise fall
// back to a translated generic message.
function apiOrFallback(t: TFunction, error: unknown, key: string): string {
  if (error instanceof Error && error.message && !error.message.startsWith('HTTP ')) {
    return error.message
  }
  return t(key)
}

export function sessionStartErrorMessage(t: TFunction, error: unknown): string {
  return apiOrFallback(t, error, 'errors.sessionStart')
}

export function loadMoreErrorMessage(t: TFunction, error: unknown): string {
  return apiOrFallback(t, error, 'errors.loadMore')
}

export function onboardingSaveErrorMessage(t: TFunction, error: unknown): string {
  return apiOrFallback(t, error, 'errors.onboardingSave')
}

export function globalErrorMessage(t: TFunction): { title: string; message: string } {
  return {
    title: t('errors.global.title'),
    message: t('errors.global.message'),
  }
}
