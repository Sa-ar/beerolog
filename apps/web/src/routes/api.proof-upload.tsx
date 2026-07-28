/**
 * POST /api/proof-upload — accepts a multipart image and stores it in Vercel
 * Blob as Catch proof (issue #330, ADR 0011). Clerk-authed; the Blob write
 * token never leaves the server. Returns { url }. Content is not verified —
 * only MIME + size are checked (uploadProof).
 */
import { auth } from '@clerk/tanstack-react-start/server'
import { createFileRoute } from '@tanstack/react-router'
import { ProofUploadError, uploadProof } from '../lib/proof-upload'

export const Route = createFileRoute('/api/proof-upload')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { userId } = await auth()
        if (!userId) return new Response('Unauthorized', { status: 401 })

        const form = await request.formData().catch(() => null)
        const file = form?.get('file')
        if (!(file instanceof File)) return new Response('Missing file', { status: 400 })

        try {
          const { url } = await uploadProof(file, { userId })
          return Response.json({ url }, { status: 201 })
        } catch (err) {
          // Boundary rejections (bad MIME / size) are the client's fault, not 500.
          if (err instanceof ProofUploadError) return new Response(err.message, { status: 422 })
          throw err
        }
      },
    },
  },
})
