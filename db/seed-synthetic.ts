import { PostgresStore } from '../server/storage/postgres-store.js'
import type { DetectionMatch, EventInput } from '../server/data-model.js'
import { createAdminPool, localInsecureFromEnv, requiredEnv } from './admin-connection.js'

const workspaceId = requiredEnv('SENTINEL_WORKSPACE_ID')
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
  throw new Error('WORKSPACE_ID must be a UUID')
}
const admin = createAdminPool(requiredEnv('DATABASE_ADMIN_URL'), localInsecureFromEnv('DATABASE_ADMIN_ALLOW_LOCAL_INSECURE'))
const runtimeUrl = requiredEnv('DATABASE_URL')
const allowLocalInsecure = localInsecureFromEnv('SENTINEL_ALLOW_LOCAL_DATABASE')

const eventInputs: EventInput[] = [
  { eventId: 'seed-synthetic-auth-001', timestamp: new Date(Date.now() - 180_000).toISOString(), event: 'Repeated failed sign-ins in synthetic fixture', source: 'synthetic-auth', host: 'host-a.example.test', user: 'fixture-user', srcIp: '192.0.2.10', severity: 'medium' as const, outcome: 'denied', attributes: { failures: 5, scenario: 'synthetic-seed' }, raw: '{"synthetic":true,"scenario":"repeated-auth-failures"}' },
  { eventId: 'seed-synthetic-process-001', timestamp: new Date(Date.now() - 120_000).toISOString(), event: 'Encoded command argument in synthetic fixture', source: 'synthetic-endpoint', host: 'host-b.example.test', user: 'fixture-operator', srcIp: '198.51.100.20', severity: 'high' as const, outcome: 'observed', attributes: { process: 'example.exe', scenario: 'synthetic-seed' }, raw: '{"synthetic":true,"scenario":"encoded-command"}' },
  { eventId: 'seed-synthetic-dns-001', timestamp: new Date(Date.now() - 60_000).toISOString(), event: 'Uncommon test domain in synthetic fixture', source: 'synthetic-dns', host: 'host-c.example.test', user: 'system', srcIp: '203.0.113.30', severity: 'low' as const, outcome: 'blocked', attributes: { query: 'demo.example.test', scenario: 'synthetic-seed' }, raw: '{"synthetic":true,"scenario":"rare-dns"}' },
]
const matches: DetectionMatch[][] = [
  [{ ruleId: 'SYN-AUTH-001', name: 'Repeated authentication failures', severity: 'medium' as const, techniqueId: 'T1110', reason: 'Synthetic repeated-failure scenario matched.', evidence: ['Five synthetic denied attempts.'] }],
  [{ ruleId: 'SYN-PROC-001', name: 'Encoded command argument', severity: 'high' as const, techniqueId: 'T1059', reason: 'Synthetic process scenario matched.', evidence: ['Synthetic command argument metadata.'] }],
  [],
]

try {
  await admin.query(
    `INSERT INTO workspaces (id, name) VALUES ($1, 'Synthetic demonstration workspace') ON CONFLICT (id) DO NOTHING`,
    [workspaceId],
  )
  const store = new PostgresStore({ connectionString: runtimeUrl, workspaceId, allowLocalInsecure })
  try {
    await store.ping()
    const result = await store.ingest(eventInputs, matches)
    process.stdout.write(`Synthetic seed complete: ${result.accepted} accepted, ${result.duplicates} duplicates, ${result.findings} findings.\n`)
  } finally {
    await store.close()
  }
} catch {
  process.stderr.write('Synthetic seed failed; verify workspace setup and separate admin/runtime configuration.\n')
  process.exitCode = 1
} finally {
  await admin.end()
}
