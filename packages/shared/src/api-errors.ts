type ApiErrorBody = {
  detail?: string | { msg?: string }[]
}

export function formatApiError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const body = error as ApiErrorBody
    if (typeof body.detail === 'string' && body.detail.length > 0) {
      return body.detail
    }
    if (Array.isArray(body.detail) && body.detail.length > 0) {
      const first = body.detail[0]
      if (first && typeof first.msg === 'string') {
        return first.msg
      }
    }
  }
  return fallback
}
