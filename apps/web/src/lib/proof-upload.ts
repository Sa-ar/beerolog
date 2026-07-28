/**
 * Proof-photo upload for Catches (issue #330, ADR 0011). A photo's presence
 * upgrades a Rating to a Catch; its content is NOT verified — we only validate
 * MIME + size at the trust boundary. The Blob write token is server-side only,
 * so this module is imported from the /api/proof-upload server route, never the
 * client bundle.
 */
import { put } from '@vercel/blob'

// 8 MB — a phone photo, not a raw/RAW upload. Bounds the public write surface.
export const MAX_PROOF_BYTES = 8 * 1024 * 1024

const ALLOWED_PROOF_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export type ProofValidation =
  | { ok: true }
  | { ok: false; error: 'unsupported_type' | 'empty' | 'too_large' }

export function validateProofFile(file: { type: string; size: number }): ProofValidation {
  if (!(file.type in ALLOWED_PROOF_TYPES)) return { ok: false, error: 'unsupported_type' }
  if (file.size <= 0) return { ok: false, error: 'empty' }
  if (file.size > MAX_PROOF_BYTES) return { ok: false, error: 'too_large' }
  return { ok: true }
}

export class ProofUploadError extends Error {}

export async function uploadProof(
  file: File,
  opts: { userId: string; token?: string },
): Promise<{ url: string }> {
  const check = validateProofFile(file)
  if (!check.ok) throw new ProofUploadError(check.error)
  const ext = ALLOWED_PROOF_TYPES[file.type]
  // User-scoped, non-guessable key; content is public (it's a share artifact).
  const key = `proof/${opts.userId}/${crypto.randomUUID()}.${ext}`
  // Omit token entirely when absent so @vercel/blob falls back to its own env
  // lookup (exactOptionalPropertyTypes rejects an explicit undefined).
  const token = opts.token ?? process.env.BLOB_READ_WRITE_TOKEN
  const { url } = await put(key, file, {
    access: 'public',
    contentType: file.type,
    addRandomSuffix: false,
    ...(token ? { token } : {}),
  })
  return { url }
}
