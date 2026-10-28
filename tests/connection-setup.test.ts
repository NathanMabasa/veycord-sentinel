import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import test from 'node:test'
import { connectionCheckBatch, connectionCommand, connectionOrigin } from '../src/features/site/connection-setup.ts'
import { parseEventBatch } from '../server/private-validation.ts'

test('connection origins allow HTTPS and loopback HTTP while rejecting embedded credentials and paths', () => {
  for (const origin of ['https://sentinel.example.org', 'http://localhost:8787', 'http://127.0.0.1:8787', 'http://[::1]:8787']) assert.equal(connectionOrigin(origin).origin, origin)
  for (const origin of ['', 'https://' + 'a'.repeat(200), 'http://sentinel.example.org', 'ftp://sentinel.example.org', 'https://user:secret@sentinel.example.org', 'https://sentinel.example.org/api', 'https://sentinel.example.org?token=secret', 'https://sentinel.example.org#key']) assert.ok(connectionOrigin(origin).error)
})

test('generated Bash is valid and keeps the key out of arguments, exports and stored configuration', () => {
  for (const kind of ['health', 'ingest'] as const) {
    const command = connectionCommand('http://127.0.0.1:8787', kind)
    execFileSync('bash', ['-n'], { input: command })
    assert.match(command, /read -r -s -p/)
    assert.match(command, /--header @-/)
    assert.doesNotMatch(command, /export SENTINEL_API_TOKEN|Authorization: Bearer \$\{|VITE_|\.env/)
  }
  assert.throws(() => connectionCommand('http://remote.example.org', 'health'))
  const origin = 'https://o\'hare.example'
  const assignment = connectionCommand(origin, 'health').split('\n').find(line => line.includes('SENTINEL_URL='))!
  const result = execFileSync('bash', ['-c', assignment + '\nprintf %s "$SENTINEL_URL"'], { encoding: 'utf8' })
  assert.equal(result, origin)
})

test('downloaded check event satisfies the strict private API contract and has a stable synthetic identity', () => {
  const sample = connectionCheckBatch('2026-10-28T12:00:00Z')
  const events = parseEventBatch(sample)
  assert.equal(events.length, 1)
  assert.equal(events[0].eventId, connectionCheckBatch().events[0].eventId)
  assert.equal(events[0].attributes?.synthetic, true)
  assert.equal(events[0].severity, 'low')
  assert.ok(JSON.stringify(sample).length < 1024)
})
