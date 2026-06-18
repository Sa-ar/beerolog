// Pull a human-readable message out of a Clerk error without depending on the
// `/errors` subpath export (its path differs across Clerk packages/versions).
export function clerkErrorMessage(err: unknown, fallback: string): string {
  const e = err as { errors?: Array<{ longMessage?: string; message?: string }> }
  return e?.errors?.[0]?.longMessage ?? e?.errors?.[0]?.message ?? fallback
}
