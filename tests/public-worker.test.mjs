import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker from '../dist/server/index.js'

const request = (path, init) => worker.fetch(new Request(`https://sentinel.example${path}`, init))

test('public API returns synthetic data and filters real responses', async () => {
  const health = await request('/api/v1/health')
  assert.equal(health.status, 200)
  assert.equal((await health.json()).mode, 'synthetic-demo')
  const events = await request('/api/v1/events?q=PowerShell&limit=1')
  const payload = await events.json()
  assert.equal(payload.data.length, 1)
  assert.match(payload.data[0].event, /PowerShell/)
  assert.equal((await request('/api/v1/events?limit=1000')).status, 400)
})

test('private API is absent and public writes are rejected', async () => {
  assert.equal((await request('/api/private/v1/health')).status, 404)
  assert.equal((await request('/api/private/v1/events', { method: 'POST', body: '{}' })).status, 404)
  assert.equal((await request('/api/v1/events', { method: 'POST', body: '{}' })).status, 405)
})

test('SPA deep links and hashed assets have correct types and caching', async () => {
  const page = await request('/demo?view=events')
  assert.equal(page.status, 200)
  assert.match(page.headers.get('content-type'), /text\/html/)
  assert.equal(page.headers.get('cache-control'), 'no-cache')
  const html = await page.text()
  const script = html.match(/src="(\/assets\/[^" ]+\.js)"/)[1]
  const asset = await request(script)
  assert.equal(asset.status, 200)
  assert.match(asset.headers.get('content-type'), /javascript/)
  assert.match(asset.headers.get('cache-control'), /immutable/)
  assert.equal((await request('/assets/missing.js')).status, 404)
})

test('security policy covers pages, assets and API errors; no inline script allowance', async () => {
  for (const path of ['/', '/docs/api', '/workspace', '/api/private/v1/events', '/assets/missing.js']) {
    const response = await request(path)
    assert.equal(response.headers.get('x-frame-options'), 'DENY')
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
    assert.match(response.headers.get('content-security-policy'), /script-src 'self';/)
    assert.match(response.headers.get('content-security-policy'), /connect-src 'self';/)
  }
})

test('HEAD, unsupported page methods and oversized URLs are bounded', async () => {
  const head = await request('/demo', { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  assert.equal((await request('/demo', { method: 'POST' })).status, 405)
  assert.equal((await request('/api/v1/events?q=' + 'a'.repeat(4100))).status, 414)
})
