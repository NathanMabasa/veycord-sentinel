import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { spawn, execFile as execFileCallback } from 'node:child_process'
import { createServer } from 'node:net'
import { test } from 'node:test'
import { Pool } from 'pg'
import { PostgresStore, StoreNotFoundError, StoreQuotaError } from '../server/storage/postgres-store.js'

const execFile = promisify(execFileCallback)

function runningInCi(): boolean {
  return /^(1|true)$/i.test(process.env.CI ?? '') || process.env.GITHUB_ACTIONS === 'true'
}

async function startPostgres(dataDir: string, logFile: string, port: number): Promise<void> {
  try {
    await execFile('pg_ctl', [
      '-D', dataDir, '-l', logFile,
      '-o', `-h 127.0.0.1 -p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=''`,
      '-w', 'start',
    ])
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    let serverLog = '(PostgreSQL log unavailable)'
    try {
      serverLog = (await readFile(logFile, 'utf8')).slice(-12_000)
    } catch {
      // Preserve the startup failure if the log could not be read.
    }
    throw new Error(`Disposable PostgreSQL startup failed (${code ?? 'unknown error'}). Last server log output, capped at 12000 characters:\n${serverLog}`)
  }
}

test('database connections require verified TLS remotely or an explicit loopback-only override', async () => {
  const workspaceId = randomUUID()
  assert.throws(
    () => new PostgresStore({ connectionString: 'postgresql://sentinel_app:secret@db.example.test/veycord?sslmode=require', workspaceId }),
    /Database connection configuration is invalid/,
  )
  assert.throws(
    () => new PostgresStore({ connectionString: 'postgresql://sentinel_app:secret@localhost/veycord', workspaceId }),
    /Database connection configuration is invalid/,
  )
  const insecureLocal = new PostgresStore({ connectionString: 'postgresql://sentinel_app:secret@localhost/veycord', workspaceId, allowLocalInsecure: true })
  await insecureLocal.close()
  const verifiedRemote = new PostgresStore({ connectionString: 'postgresql://sentinel_app:secret@db.example.test/veycord?sslmode=verify-full', workspaceId })
  await verifiedRemote.close()
  assert.throws(
    () => new PostgresStore({ connectionString: 'postgresql://sentinel_app:secret@db.example.test/veycord?sslmode=disable', workspaceId, allowLocalInsecure: true }),
    /Database connection configuration is invalid/,
  )
})

async function freePort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Could not allocate local test port')
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  return address.port
}

function connectionString(user: string, password: string, port: number): string {
  const url = new URL(`postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/postgres`)
  url.searchParams.set('sslmode', 'disable')
  return url.toString()
}

test('PostgresStore isolates workspaces and persists bounded event, finding, and case operations', async (context) => {
  const missingBinaries: string[] = []
  for (const binary of ['initdb', 'pg_ctl']) {
    try {
      await execFile(binary, ['--version'])
    } catch {
      missingBinaries.push(binary)
    }
  }
  if (missingBinaries.length > 0) {
    const message = `PostgreSQL test binaries are unavailable: ${missingBinaries.join(', ')}`
    if (runningInCi()) throw new Error(message)
    context.skip(`${message}; local PostgreSQL integration was not exercised`)
    return
  }

  const temp = await mkdtemp(join(tmpdir(), 'veycord-pg-test-'))
  const dataDir = join(temp, 'data')
  const logFile = join(temp, 'postgres.log')
  const passwordFile = join(temp, 'initdb-password')
  const adminPassword = randomBytes(36).toString('base64url')
  const runtimePassword = randomBytes(36).toString('base64url')
  const port = await freePort()
  let started = false
  let store: PostgresStore | undefined
  let runtimePool: Pool | undefined

  try {
    await writeFile(passwordFile, `${adminPassword}\n`, { mode: 0o600 })
    await execFile('initdb', ['--username=postgres', '--auth-host=scram-sha-256', '--auth-local=scram-sha-256', `--pwfile=${passwordFile}`, dataDir])
    await startPostgres(dataDir, logFile, port)
    started = true
    const adminUrl = connectionString('postgres', adminPassword, port)
    const admin = new Pool({ connectionString: adminUrl, ssl: false, max: 1, connectionTimeoutMillis: 3000 })
    const runtimeUrl = connectionString('sentinel_app', runtimePassword, port)
    const workspaceId = randomUUID()
    const secondWorkspaceId = randomUUID()
    const raceWorkspaceId = randomUUID()
    const byteWorkspaceId = randomUUID()
    const retentionRaceWorkspaceId = randomUUID()
    const analyticsWorkspaceId = randomUUID()
    try {
      const cliEnv = {
        ...process.env,
        DATABASE_ADMIN_URL: adminUrl,
        DATABASE_ADMIN_ALLOW_LOCAL_INSECURE: 'true',
        SENTINEL_APP_PASSWORD: runtimePassword,
        DATABASE_URL: runtimeUrl,
        SENTINEL_ALLOW_LOCAL_DATABASE: 'true',
        SENTINEL_WORKSPACE_ID: workspaceId,
      }
      const bootstrap = await execFile(process.execPath, ['--import', 'tsx', 'db/bootstrap-runtime-role.ts'], { cwd: process.cwd(), env: cliEnv })
      assert.ok(!bootstrap.stdout.includes(runtimePassword))
      await execFile(process.execPath, ['--import', 'tsx', 'db/migrate.ts'], { cwd: process.cwd(), env: cliEnv })
      await admin.query('INSERT INTO workspaces (id, name) VALUES ($1, $2), ($3, $4), ($5, $6), ($7, $8), ($9, $10), ($11, $12)',
        [workspaceId, 'Workspace A', secondWorkspaceId, 'Workspace B', raceWorkspaceId, 'Race workspace', byteWorkspaceId, 'Byte workspace', retentionRaceWorkspaceId, 'Retention race workspace', analyticsWorkspaceId, 'Analytics workspace'])
      await admin.query('UPDATE workspaces SET max_events = 2, max_event_bytes = 100000, max_cases = 1 WHERE id = $1', [workspaceId])
      await admin.query('UPDATE workspaces SET max_events = 1 WHERE id = $1', [raceWorkspaceId])
      await admin.query('UPDATE workspaces SET max_event_bytes = 1 WHERE id = $1', [byteWorkspaceId])

      const analyticsStore = new PostgresStore({ connectionString: runtimeUrl, workspaceId: analyticsWorkspaceId, allowLocalInsecure: true })
      try {
        const emptyAnalytics = await analyticsStore.analytics()
        assert.equal(emptyAnalytics.buckets.length, 24)
        assert.ok(emptyAnalytics.buckets.every((bucket) => bucket.count === 0))
        assert.deepEqual(emptyAnalytics.sources, [])
        assert.deepEqual(emptyAnalytics.severities, [
          { severity: 'high', count: 0 },
          { severity: 'medium', count: 0 },
          { severity: 'low', count: 0 },
        ])

        const now = Date.now()
        const analyticsBase = { event: 'Synthetic analytics event', host: 'analytics.example.test' }
        const analyticsEvents = [
          { ...analyticsBase, eventId: 'analytics-current-a', timestamp: new Date(now - 10 * 60_000).toISOString(), source: 'synthetic-primary', severity: 'high' as const },
          { ...analyticsBase, eventId: 'analytics-current-b', timestamp: new Date(now - 8 * 60_000).toISOString(), source: 'synthetic-primary', severity: 'medium' as const },
          { ...analyticsBase, eventId: 'analytics-previous-hour', timestamp: new Date(now - 90 * 60_000).toISOString(), source: 'synthetic-secondary', severity: 'low' as const },
          { ...analyticsBase, eventId: 'analytics-outside-old', timestamp: new Date(now - 25 * 60 * 60_000).toISOString(), source: 'outside-old', severity: 'high' as const },
          { ...analyticsBase, eventId: 'analytics-outside-future', timestamp: new Date(now + 60_000).toISOString(), source: 'outside-future', severity: 'high' as const },
        ]
        await analyticsStore.ingest(analyticsEvents, analyticsEvents.map(() => []))
        const analytics = await analyticsStore.analytics()
        assert.equal(Date.parse(analytics.to) - Date.parse(analytics.from), 24 * 60 * 60_000)
        assert.equal(analytics.buckets.length, 24)
        assert.ok(analytics.buckets.every((bucket, index) => index === 0 || Date.parse(bucket.timestamp) - Date.parse(analytics.buckets[index - 1].timestamp) === 60 * 60_000))
        assert.equal(analytics.buckets.reduce((sum, bucket) => sum + bucket.count, 0), 3)
        assert.deepEqual(analytics.sources, [
          { source: 'synthetic-primary', count: 2 },
          { source: 'synthetic-secondary', count: 1 },
        ])
        assert.deepEqual(analytics.severities, [
          { severity: 'high', count: 1 },
          { severity: 'medium', count: 1 },
          { severity: 'low', count: 1 },
        ])
        assert.equal(analytics.buckets[22].count, 1)
        assert.equal(analytics.buckets[23].count, 2)
      } finally {
        await analyticsStore.close()
      }

      store = new PostgresStore({ connectionString: runtimeUrl, workspaceId, allowLocalInsecure: true })
      await store.ping()
      const first = {
        eventId: 'test-event-1', timestamp: '2026-10-24T08:00:00.000Z', event: 'Synthetic login failure', source: 'test-source',
        host: 'fixture.example.test', user: 'test-user', srcIp: '192.0.2.25', severity: 'medium' as const,
        outcome: 'denied', attributes: { attempt: 1, synthetic: true }, raw: '{"synthetic":true}',
      }
      const second = { ...first, eventId: 'test-event-2', timestamp: '2026-10-24T09:00:00.000Z', event: 'Second synthetic event' }
      const match = { ruleId: 'TEST-001', name: 'Synthetic test finding', severity: 'medium' as const, techniqueId: 'T1110', reason: 'Synthetic test match.', evidence: ['One synthetic evidence item.'] }
      assert.deepEqual(await store.ingest([first, second], [[match], []]), { accepted: 2, duplicates: 0, findings: 1 })
      assert.deepEqual(await store.ingest([first], [[match]]), { accepted: 0, duplicates: 1, findings: 0 })
      assert.deepEqual(await store.summary(), { eventCount: 2, findingCount: 1, openCaseCount: 0, latestEventAt: '2026-10-24T09:00:00.000Z' })
      const firstOperations = await store.operations()
      assert.deepEqual(firstOperations.limits, { maxEvents: 2, maxEventBytes: 100000, maxCases: 1, maxAuditEntries: 200000, retentionDays: 30 })
      assert.equal(firstOperations.usage.eventCount, 2)
      assert.ok(firstOperations.usage.eventBytes > 0)
      await assert.rejects(store.ingest([
        { ...first, eventId: 'over-quota-1' },
        { ...first, eventId: 'over-quota-2' },
      ], [[match], [match]]), StoreQuotaError)
      assert.equal((await store.summary()).eventCount, 2)
      assert.equal((await store.listFindings(10)).length, 1)

      const page = await store.listEvents({ from: '2026-10-24T00:00:00Z', to: '2026-10-25T00:00:00Z', limit: 1 })
      assert.equal(page.data.length, 1)
      assert.ok(page.nextCursor)
      const nextPage = await store.listEvents({ from: '2026-10-24T00:00:00Z', to: '2026-10-25T00:00:00Z', limit: 1, cursor: page.nextCursor! })
      assert.equal(nextPage.data.length, 1)
      assert.notEqual(page.data[0].id, nextPage.data[0].id)
      await assert.rejects(
        store.listEvents({ from: '2026-10-24T00:00:00Z', to: '2026-10-25T00:00:00Z', limit: 1, q: 'other', cursor: page.nextCursor! }),
      )

      const findings = await store.listFindings(10)
      assert.equal(findings.length, 1)
      assert.equal(findings[0].eventId, 'test-event-1')
      const caseRecord = await store.createCase({ title: 'Synthetic investigation', note: 'Fixture-only note.', findingId: findings[0].id })
      assert.equal(caseRecord.findingId, findings[0].id)
      assert.equal((await store.updateCase(caseRecord.id, { status: 'closed' }))?.status, 'closed')
      assert.equal((await store.listCases(10)).length, 1)
      await assert.rejects(store.createCase({ title: 'Second case', note: 'Over quota.' }), StoreQuotaError)
      const auditSize = (await store.listAudit(100)).length
      await admin.query('UPDATE workspaces SET max_audit_entries=$2 WHERE id=$1',[workspaceId,auditSize])
      await assert.rejects(store.updateCase(caseRecord.id,{note:'Must roll back at audit cap'}),StoreQuotaError)
      assert.equal((await store.listCases(10))[0].note,'Fixture-only note.')
      assert.equal((await store.listAudit(100)).length,auditSize)
      await admin.query('UPDATE workspaces SET max_audit_entries=200000 WHERE id=$1',[workspaceId])
      const mutationAudit = await store.listAudit(100)
      assert.deepEqual(new Set(mutationAudit.map((entry) => entry.action)), new Set(['events.ingested', 'case.created', 'case.updated']))
      assert.ok(mutationAudit.every((entry) => !JSON.stringify(entry.details).includes('Fixture-only note.')))
      assert.ok(mutationAudit.every((entry) => !JSON.stringify(entry.details).includes('synthetic":true')))

      const raceStoreA = new PostgresStore({ connectionString: runtimeUrl, workspaceId: raceWorkspaceId, allowLocalInsecure: true })
      const raceStoreB = new PostgresStore({ connectionString: runtimeUrl, workspaceId: raceWorkspaceId, allowLocalInsecure: true })
      try {
        const raceEvents = [
          { ...first, eventId: 'concurrent-a' },
          { ...first, eventId: 'concurrent-b' },
        ]
        const outcomes = await Promise.allSettled([
          raceStoreA.ingest([raceEvents[0]], [[]]),
          raceStoreB.ingest([raceEvents[1]], [[]]),
        ])
        assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1)
        assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected' && outcome.reason instanceof StoreQuotaError).length, 1)
        assert.equal((await raceStoreA.summary()).eventCount, 1)
      } finally {
        await raceStoreA.close()
        await raceStoreB.close()
      }

      const byteStore = new PostgresStore({ connectionString: runtimeUrl, workspaceId: byteWorkspaceId, allowLocalInsecure: true })
      try {
        await assert.rejects(byteStore.ingest([{ ...first, eventId: 'too-many-bytes' }], [[]]), StoreQuotaError)
        assert.equal((await byteStore.summary()).eventCount, 0)
        assert.equal((await byteStore.listAudit(10)).length, 0)
      } finally {
        await byteStore.close()
      }

      const secondTenantStore = new PostgresStore({ connectionString: runtimeUrl, workspaceId: secondWorkspaceId, allowLocalInsecure: true })
      try {
        const privateEvent = {
          eventId: 'private-event', timestamp: '2026-10-24T10:00:00.000Z', event: 'Private synthetic workspace event', source: 'private-source',
          host: 'other.example.test', severity: 'low' as const,
        }
        await secondTenantStore.ingest([privateEvent, privateEvent], [[], []])
        const privateEvents = await secondTenantStore.listEvents({ from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00Z', limit: 10 })
        assert.equal(privateEvents.data.length, 1)
        assert.equal((await store.listEvents({ from: '2026-10-01T00:00:00Z', to: '2026-11-01T00:00:00Z', limit: 10 })).data.length, 2)
        const secondTenantAudit = await secondTenantStore.listAudit(10)
        assert.equal(secondTenantAudit.length, 1)
        assert.equal(secondTenantAudit[0].action, 'events.ingested')
        assert.equal(secondTenantAudit[0].details.duplicates, 1)
        assert.ok((await store.listAudit(100)).every((entry) => entry.details.duplicates !== 1))
        await assert.rejects(secondTenantStore.createCase({ title: 'Cross-workspace reference', note: '', findingId: findings[0].id }), StoreNotFoundError)
      } finally {
        await secondTenantStore.close()
      }

      runtimePool = new Pool({ connectionString: runtimeUrl, ssl: false, max: 1 })
      const deniedWithoutWorkspace = await runtimePool.query('SELECT count(*)::int AS count FROM events')
      assert.equal(deniedWithoutWorkspace.rows[0].count, 0)
      const auditDeniedWithoutWorkspace = await runtimePool.query('SELECT count(*)::int AS count FROM audit_entries')
      assert.equal(auditDeniedWithoutWorkspace.rows[0].count, 0)
      await assert.rejects(runtimePool.query('UPDATE audit_entries SET action = action'))
      await assert.rejects(runtimePool.query('DELETE FROM audit_entries'))

      if (process.env.SENTINEL_BROWSER_AUDIT === 'true') {
        const browserWorkspaceId = randomUUID()
        await admin.query('INSERT INTO workspaces (id,name) VALUES ($1,$2)',[browserWorkspaceId,'Synthetic browser audit'])
        const httpPort = await freePort()
        const serviceToken = randomBytes(36).toString('base64url')
        const base = `http://127.0.0.1:${httpPort}`
        const child = spawn(process.execPath,['build/server/node.js'],{
          cwd:process.cwd(), stdio:'ignore',
          env:{PATH:process.env.PATH,DATABASE_URL:runtimeUrl,SENTINEL_ALLOW_LOCAL_DATABASE:'true',SENTINEL_PRIVATE_ENABLED:'true',SENTINEL_WORKSPACE_ID:browserWorkspaceId,SENTINEL_API_TOKEN:serviceToken,SENTINEL_PORT:String(httpPort)},
        })
        try {
          let ready = false
          for(let attempt=0;attempt<40;attempt++) {
            try { ready = (await fetch(`${base}/api/v1/health`)).ok } catch { /* Startup pending. */ }
            if(ready)break
            await new Promise(resolve=>setTimeout(resolve,100))
          }
          assert.ok(ready,'standalone server must start')
          await execFile('python3',['scripts/private_browser_audit.py'],{env:{...process.env,VEYCORD_AUDIT_URL:base,SENTINEL_AUDIT_TOKEN:serviceToken},timeout:60000})
        } finally {
          child.kill('SIGTERM')
          await new Promise<void>(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',()=>resolve())})
        }
      }

      const seedEnv = { ...cliEnv, SENTINEL_WORKSPACE_ID: secondWorkspaceId }
      await execFile(process.execPath, ['--import', 'tsx', 'db/seed-synthetic.ts'], { cwd: process.cwd(), env: seedEnv })
      const secondSeedStore = new PostgresStore({ connectionString: runtimeUrl, workspaceId: secondWorkspaceId, allowLocalInsecure: true })
      try {
        const secondSummary = await secondSeedStore.summary()
        assert.equal(secondSummary.eventCount, 4)
        assert.ok((await secondSeedStore.listAudit(10)).some((entry) => entry.action === 'events.ingested'))
      } finally {
        await secondSeedStore.close()
      }

      const limitsEnv = { ...cliEnv, SENTINEL_WORKSPACE_ID: workspaceId }
      const limitsDryRun = await execFile(process.execPath, ['--import', 'tsx', 'db/limits.ts', '--max-events', '3'], { cwd: process.cwd(), env: limitsEnv })
      assert.equal(JSON.parse(limitsDryRun.stdout).mode, 'dry-run')
      assert.equal((await store.operations()).limits.maxEvents, 2)
      await execFile(process.execPath, ['--import', 'tsx', 'db/limits.ts', '--max-events', '3', '--apply'], { cwd: process.cwd(), env: limitsEnv })
      assert.equal((await store.operations()).limits.maxEvents, 3)
      await assert.rejects(execFile(process.execPath, ['--import', 'tsx', 'db/limits.ts', '--max-events', '1', '--apply'], { cwd: process.cwd(), env: limitsEnv }))
      assert.equal((await store.operations()).limits.maxEvents, 3)
      assert.ok((await store.listAudit(100)).some(entry=>entry.action==='limits.updated' && entry.actor==='maintenance'))

      await admin.query("UPDATE events SET received_at = now() - interval '31 days' WHERE workspace_id = $1", [workspaceId])
      const beforeRetention = await store.operations()
      assert.equal(beforeRetention.retention.eligibleEvents, 1)
      assert.equal(beforeRetention.retention.heldEvents, 1)
      const retentionEnv = { ...cliEnv, SENTINEL_WORKSPACE_ID: workspaceId }
      const dryRun = await execFile(process.execPath, ['--import', 'tsx', 'db/retention.ts'], { cwd: process.cwd(), env: retentionEnv })
      const dryRunResult = JSON.parse(dryRun.stdout) as { mode: string; deletedEvents: number; eligibleEvents: number; heldEvents: number }
      assert.deepEqual({ mode: dryRunResult.mode, deletedEvents: dryRunResult.deletedEvents, eligibleEvents: dryRunResult.eligibleEvents, heldEvents: dryRunResult.heldEvents },
        { mode: 'dry-run', deletedEvents: 0, eligibleEvents: 1, heldEvents: 1 })
      assert.equal((await store.summary()).eventCount, 2)
      const applied = await execFile(process.execPath, ['--import', 'tsx', 'db/retention.ts', '--apply'], { cwd: process.cwd(), env: retentionEnv })
      const applyResult = JSON.parse(applied.stdout) as { mode: string; deletedEvents: number; heldEvents: number }
      assert.deepEqual({ mode: applyResult.mode, deletedEvents: applyResult.deletedEvents, heldEvents: applyResult.heldEvents },
        { mode: 'applied', deletedEvents: 1, heldEvents: 1 })
      assert.equal((await store.summary()).eventCount, 1)
      assert.ok((await store.listAudit(100)).some((entry) => entry.action === 'retention.applied' && entry.actor === 'maintenance'))

      const retentionRaceStore = new PostgresStore({ connectionString: runtimeUrl, workspaceId: retentionRaceWorkspaceId, allowLocalInsecure: true })
      try {
        const raced = { ...first, eventId: 'retention-case-race' }
        await retentionRaceStore.ingest([raced], [[match]])
        const raceFinding = (await retentionRaceStore.listFindings(10))[0]
        await admin.query("UPDATE events SET received_at = now() - interval '31 days' WHERE workspace_id = $1", [retentionRaceWorkspaceId])
        const createCase = retentionRaceStore.createCase({ title: 'Retention race case', note: '', findingId: raceFinding.id })
        const applyRetention = execFile(process.execPath, ['--import', 'tsx', 'db/retention.ts', '--apply'], {
          cwd: process.cwd(), env: { ...cliEnv, SENTINEL_WORKSPACE_ID: retentionRaceWorkspaceId },
        })
        const [caseOutcome, retentionOutcome] = await Promise.allSettled([createCase, applyRetention])
        assert.equal(retentionOutcome.status, 'fulfilled')
        if (caseOutcome.status === 'fulfilled') {
          assert.equal((await retentionRaceStore.summary()).eventCount, 1)
          assert.equal((await retentionRaceStore.operations()).retention.heldEvents, 1)
        } else {
          assert.ok(caseOutcome.reason instanceof StoreNotFoundError)
          assert.equal((await retentionRaceStore.summary()).eventCount, 0)
        }
      } finally {
        await retentionRaceStore.close()
      }
    } finally {
      await runtimePool?.end()
      await store?.close()
      await admin.end()
    }
  } finally {
    if (started) await execFile('pg_ctl', ['-D', dataDir, '-m', 'immediate', '-w', 'stop']).catch(() => {})
    await rm(temp, { recursive: true, force: true })
  }
})
