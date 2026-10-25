import assert from 'node:assert/strict'
import test from 'node:test'
import app, { createApp } from '../server/app.ts'

const get = (path: string, init?: RequestInit) => app.fetch(new Request(`http://localhost${path}`, init))

test('health identifies the fixture-only unauthenticated mode and sets security headers', async () => {
  const response = await get('/api/v1/health')
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok', mode: 'synthetic-demo', authenticated: false })
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('access-control-allow-origin'), null)
})

test('event search returns bounded synthetic data and supports opaque pagination', async () => {
  const first = await get('/api/v1/events?limit=2')
  const body = await first.json() as { data: Array<{ id: string }>; page: { nextCursor: string | null } }
  assert.equal(body.data.length, 2)
  assert.ok(body.page.nextCursor)
  const second = await get(`/api/v1/events?limit=2&cursor=${encodeURIComponent(body.page.nextCursor!)}`)
  const next = await second.json() as { data: Array<{ id: string }> }
  assert.equal(next.data.length, 2)
  assert.notEqual(body.data[0].id, next.data[0].id)
})

test('event search applies supported filters', async () => {
  const response = await get('/api/v1/events?source=Windows%20Security&severity=high&q=PowerShell')
  const body = await response.json() as { data: Array<{ id: string; severity: string }> }
  assert.equal(body.data.length, 1)
  assert.equal(body.data[0].id, 'evt-7f21a0')
  assert.equal(body.data[0].severity, 'high')
})

test('event search rejects impossible dates and accepts valid RFC 3339 offsets', async () => {
  for (const value of [
    '2026-02-30T00:00:00Z',
    '2026-02-29T00:00:00Z',
    '2026-10-23T24:00:00Z',
    '2026-10-23T12:00:00+24:00',
    '2026-10-23T12:00:00+02:60',
  ]) {
    const response = await get(`/api/v1/events?from=${encodeURIComponent(value)}`)
    assert.equal(response.status, 400, value)
  }
  const valid = await get('/api/v1/events?from=2026-10-23T09:00:00%2B02:00&to=2026-10-23T10:00:00%2B02:00')
  assert.equal(valid.status, 200)
})

test('event search handles empty matches and enforces field and date range bounds', async () => {
  const empty = await get('/api/v1/events?q=no-such-fixture')
  assert.deepEqual(await empty.json(), { data: [], page: { nextCursor: null } })
  for (const path of [
    `/api/v1/events?q=${'a'.repeat(121)}`,
    '/api/v1/events?source=',
    '/api/v1/events?severity=critical',
    '/api/v1/events?from=2026-01-01T00:00:00Z&to=2026-02-02T00:00:01Z',
  ]) {
    const response = await get(path)
    assert.equal(response.status, 400, path)
  }
})

test('invalid and unbounded search inputs return a safe validation error', async () => {
  for (const path of [
    '/api/v1/events?unknown=x',
    '/api/v1/events?limit=101',
    '/api/v1/events?limit=1&limit=2',
    '/api/v1/events?from=not-a-date',
    '/api/v1/events?from=2026-01-01T00:00:00Z&to=2026-03-01T00:00:00Z',
    '/api/v1/events?cursor=garbage',
  ]) {
    const response = await get(path)
    assert.equal(response.status, 400, path)
    assert.deepEqual(await response.json(), { error: { code: 'INVALID_ARGUMENT', message: 'Request could not be validated' } })
  }
})

test('event detail, detections, and missing IDs use documented envelopes', async () => {
  const event = await get('/api/v1/events/evt-7f21a0')
  assert.equal(event.status, 200)
  assert.equal((await event.json() as { data: { id: string } }).data.id, 'evt-7f21a0')
  const missing = await get('/api/v1/events/not-real')
  assert.equal(missing.status, 404)
  const detections = await get('/api/v1/detections')
  assert.equal((await detections.json() as { data: unknown[] }).data.length, 4)
})

test('unknown API routes and unsupported methods never become SPA responses', async () => {
  const unknown = await get('/api/v1/no-such-route')
  assert.equal(unknown.status, 404)
  assert.equal((await unknown.json() as { error: { code: string } }).error.code, 'NOT_FOUND')
  const post = await get('/api/v1/events', { method: 'POST' })
  assert.equal(post.status, 405)
  assert.equal(post.headers.get('allow'), 'GET, HEAD')
  assert.equal(post.headers.get('cache-control'), 'no-store')
  assert.equal(post.headers.get('x-content-type-options'), 'nosniff')
  assert.equal((await post.json() as { error: { code: string } }).error.code, 'METHOD_NOT_ALLOWED')
  const head = await get('/api/v1/health', { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
})

test('unexpected handler errors return a safe 500 with security headers', async () => {
  const errorApp = createApp((instance) => {
    instance.get('/api/v1/__test-throw', () => { throw new Error('must not be returned') })
  })
  const response = await errorApp.fetch(new Request('http://localhost/api/v1/__test-throw'))
  assert.equal(response.status, 500)
  assert.deepEqual(await response.json(), { error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed' } })
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
})
