import server from '../apps/web/.nitro/vite/services/ssr/server.js'

export default async function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] ?? 'https'
  const host = req.headers['x-forwarded-host'] ?? req.headers.host
  const url = `${protocol}://${host}${req.url ?? '/'}`

  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const part of value) headers.append(key, part)
    } else {
      headers.set(key, value)
    }
  }

  const method = req.method ?? 'GET'
  const body =
    method === 'GET' || method === 'HEAD'
      ? undefined
      : await new Promise((resolve, reject) => {
          const chunks = []
          req.on('data', (chunk) => chunks.push(chunk))
          req.on('end', () => resolve(Buffer.concat(chunks)))
          req.on('error', reject)
        })

  const request = new Request(url, { method, headers, body })
  const response = await server.fetch(request)

  res.statusCode = response.status
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      res.appendHeader(key, value)
    } else {
      res.setHeader(key, value)
    }
  })

  const buffer = Buffer.from(await response.arrayBuffer())
  res.end(buffer)
}
