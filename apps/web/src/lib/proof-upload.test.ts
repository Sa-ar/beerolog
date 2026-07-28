import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@vercel/blob', () => ({
  put: vi.fn(async () => ({ url: 'https://blob.example/proof/user_1/abc.jpg' })),
}))

import { put } from '@vercel/blob'
import { MAX_PROOF_BYTES, uploadProof, validateProofFile } from './proof-upload'

const validFile = () => new File(['fake-image-bytes'], 'beer.jpg', { type: 'image/jpeg' })

beforeEach(() => {
  vi.mocked(put).mockClear()
})

describe('validateProofFile', () => {
  it('accepts a normal image', () => {
    expect(validateProofFile({ type: 'image/jpeg', size: 1024 })).toEqual({ ok: true })
  })

  it('rejects a non-image type', () => {
    expect(validateProofFile({ type: 'application/pdf', size: 1024 }).ok).toBe(false)
  })

  it('rejects an empty file', () => {
    expect(validateProofFile({ type: 'image/jpeg', size: 0 }).ok).toBe(false)
  })

  it('rejects an oversize file', () => {
    expect(validateProofFile({ type: 'image/jpeg', size: MAX_PROOF_BYTES + 1 }).ok).toBe(false)
  })
})

describe('uploadProof', () => {
  it('uploads a valid image and returns the blob url', async () => {
    const res = await uploadProof(validFile(), { userId: 'user_1', token: 'tok' })
    expect(res.url).toBe('https://blob.example/proof/user_1/abc.jpg')
    expect(put).toHaveBeenCalledOnce()
    const opts = vi.mocked(put).mock.calls[0]?.[2]
    expect(opts).toMatchObject({ access: 'public', contentType: 'image/jpeg' })
  })

  it('rejects a disallowed type without touching blob', async () => {
    const bad = new File(['x'], 'doc.pdf', { type: 'application/pdf' })
    await expect(uploadProof(bad, { userId: 'user_1', token: 'tok' })).rejects.toThrow()
    expect(put).not.toHaveBeenCalled()
  })
})
