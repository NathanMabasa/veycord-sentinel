import { Hono } from 'hono'
import { COLLECTOR_PREFIX, COLLECTOR_TOKEN_PATTERN, CollectorDeniedError, collectorTokenHash } from './collector-contract.js'
import type { CollectorDecision } from './collector-contract.js'
import type { DetectionMatch, EventInput } from './data-model.js'
import { evaluateEvent } from './detections.js'
import { MAX_BODY_BYTES, ValidationError, parseEventBatch } from './private-validation.js'
import { StoreInputError, StoreQuotaError } from './storage/postgres-store.js'

export interface CollectorStore {
  authorizeCollector(hash: string): Promise<CollectorDecision>
  ingestFromCollector(hash: string, events: EventInput[], matches: DetectionMatch[][]): Promise<{ accepted: number; duplicates: number; findings: number }>
}

class CollectorBodyLimitError extends Error {}
class CollectorBodyTimeoutError extends Error {}
async function readCollectorBatch(request: Request): Promise<EventInput[]> {
  if (!request.body) throw new ValidationError()
  const reader = request.body.getReader()
  const buffer = new Uint8Array(MAX_BODY_BYTES)
  let size = 0
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; void reader.cancel().catch(() => {}) }, 10_000)
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (timedOut) throw new CollectorBodyTimeoutError()
      if (done) break
      if (size + value.byteLength > buffer.byteLength) {
        void reader.cancel().catch(() => {})
        throw new CollectorBodyLimitError()
      }
      buffer.set(value, size)
      size += value.byteLength
    }
    const declared = request.headers.get('content-length')
    if (declared !== null && Number(declared) !== size) throw new ValidationError()
    let body: unknown
    try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, size))) } catch { throw new ValidationError() }
    return parseEventBatch(body)
  } finally { clearTimeout(timer); reader.releaseLock() }
}

/** Machine-only ingestion. No cookie/operator-key fallback and no read routes. */
export function createCollectorApi(store: CollectorStore) {
  const app = new Hono()
  let inFlight = 0
  app.use('*', async (c, next) => {
    await next()
    c.header('Cache-Control', 'no-store')
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('Referrer-Policy', 'no-referrer')
  })
  app.use('*', async (c, next) => {
    const url = new URL(c.req.url)
    if (url.pathname !== `${COLLECTOR_PREFIX}/events`) return c.json({ error: { code: 'NOT_FOUND', message: 'Collector route not found' } }, 404)
    if (c.req.method !== 'POST') {
      c.header('Allow', 'POST')
      return c.json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }, 405)
    }
    if (url.search || c.req.header('origin') !== undefined || c.req.header('cookie') !== undefined) {
      return c.json({ error: { code: 'INVALID_ARGUMENT', message: 'Collector requests must use the machine contract' } }, 400)
    }
    if (inFlight >= 8) {
      c.header('Retry-After', '1')
      return c.json({ error: { code: 'BUSY', message: 'Collector receiver is busy' } }, 503)
    }
    inFlight++
    try { await next() } finally { inFlight-- }
  })
  app.post(`${COLLECTOR_PREFIX}/events`, async (c, next) => {
    const header = c.req.header('authorization') ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (!COLLECTOR_TOKEN_PATTERN.test(token)) throw new CollectorDeniedError()
    const decision = await store.authorizeCollector(collectorTokenHash(token))
    if (!decision) throw new CollectorDeniedError()
    if (!decision.allowed) {
      c.header('Retry-After', String(decision.retryAfterSeconds))
      return c.json({ error: { code: 'RATE_LIMITED', message: 'Collector request limit exceeded' } }, 429)
    }
    const declared = c.req.header('content-length')
    if (declared !== undefined && !/^\d+$/.test(declared)) throw new ValidationError()
    if ((declared !== undefined && Number(declared) > MAX_BODY_BYTES) || c.req.header('content-encoding') !== undefined) {
      return c.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Send bounded uncompressed JSON' } }, 413)
    }
    await next()
  }, async c => {
    if (!/^application\/json(?:\s*;\s*charset\s*=\s*"?utf-8"?)?\s*$/i.test(c.req.header('content-type') ?? '')) throw new ValidationError()
    const events = await readCollectorBatch(c.req.raw)
    const hash = collectorTokenHash(c.req.header('authorization')!.slice(7))
    // Storage rechecks the credential under lock before committing any event.
    const data = await store.ingestFromCollector(hash, events, events.map(evaluateEvent))
    return c.json({ data }, 202)
  })
  app.onError((error, c) => {
    if (error instanceof CollectorBodyLimitError) return c.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body exceeds the allowed size' } }, 413)
    if (error instanceof CollectorBodyTimeoutError) return c.json({ error: { code: 'REQUEST_TIMEOUT', message: 'Collector request body timed out' } }, 408)
    if (error instanceof CollectorDeniedError) {
      c.header('WWW-Authenticate', 'Bearer realm="veycord-collector"')
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Collector authentication required' } }, 401)
    }
    if (error instanceof ValidationError || error instanceof StoreInputError) return c.json({ error: { code: 'INVALID_ARGUMENT', message: 'Request could not be validated' } }, 400)
    if (error instanceof StoreQuotaError) return c.json({ error: { code: 'QUOTA_EXCEEDED', message: 'Workspace capacity reached' } }, 409)
    return c.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Collector receiver is temporarily unavailable' } }, 503)
  })
  return app
}
