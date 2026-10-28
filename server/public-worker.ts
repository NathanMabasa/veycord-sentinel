import app from './app.js'
import assets from 'virtual:sentinel-public-assets'

const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
}

// Public fixture API only: deliberately no private gateway, PostgreSQL or env bindings.
export default {
  async fetch(request: Request): Promise<Response> {
    let response: Response
    const path = new URL(request.url).pathname
    if (request.url.length > 4096) {
      response = Response.json({ error: { code: 'URI_TOO_LONG', message: 'Request URL is too long' } }, { status: 414 })
    } else if (path === '/api' || path.startsWith('/api/')) {
      response = await app.fetch(request)
    } else if (!['GET', 'HEAD'].includes(request.method)) {
      response = new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    } else {
      const asset = assets[path] ?? (!path.startsWith('/assets/') && !/\.[^/]+$/.test(path) ? assets['/index.html'] : undefined)
      if (!asset) response = new Response('Not found', { status: 404 })
      else {
        const body = request.method === 'HEAD' ? null : Uint8Array.from(atob(asset.base64), character => character.charCodeAt(0))
        response = new Response(body, { headers: {
          'Content-Type': asset.contentType,
          'Cache-Control': path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
        } })
      }
    }
    const headers = new Headers(response.headers)
    for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value)
    if (!headers.has('Cache-Control')) headers.set('Cache-Control', 'no-store')
    return new Response(request.method === 'HEAD' ? null : response.body, { status: response.status, headers })
  },
}
