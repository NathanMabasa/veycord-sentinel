import { open } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createAdminPool, requiredEnv, localInsecureFromEnv } from './admin-connection.js'
import { readOperatorInput } from './identity/private-input.js'
import { COLLECTOR_SOURCE_PATTERN, newCollectorToken, collectorTokenHash } from '../server/collector-contract.js'
import { isRecord, isUuid } from '../server/private-validation.js'

/** Offline administrator tool; tokens are written only to an exclusive0600 file. */
export async function runCollectorOperator(action: string | undefined): Promise<void> {
  if (action !== 'issue' && action !== 'revoke') throw new Error('Choose issue or revoke')
  const workspace = requiredEnv('SENTINEL_WORKSPACE_ID')
  if (!isUuid(workspace)) throw new Error('Invalid workspace')
  const input: unknown = JSON.parse(await readOperatorInput(requiredEnv('SENTINEL_COLLECTOR_FILE')))
  if (!isRecord(input)) throw new Error('Invalid collector input')
  const allowedKeys = action === 'issue' ? ['source', 'ttlHours'] : ['id']
  if (Object.keys(input).some(key => !allowedKeys.includes(key))) throw new Error('Unsupported collector fields')
  const ttl = input.ttlHours ?? 24
  if (action === 'issue' && (typeof input.source !== 'string' || !COLLECTOR_SOURCE_PATTERN.test(input.source) || !Number.isInteger(ttl) || Number(ttl) < 1 || Number(ttl) > 2160)) throw new Error('Invalid source or lifetime')
  if (action === 'revoke' && (typeof input.id !== 'string' || !isUuid(input.id))) throw new Error('Invalid collector id')
  const pool = createAdminPool(requiredEnv('DATABASE_ADMIN_URL'), localInsecureFromEnv('DATABASE_ADMIN_ALLOW_LOCAL_INSECURE'))
  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 74203031))', [workspace])
      await client.query("SELECT set_config('app.workspace_id', $1, true)", [workspace])
      const quota = (await client.query<{ maximum: number; used: string }>(
        'SELECT max_audit_entries AS maximum, (SELECT count(*) FROM audit_entries WHERE workspace_id=$1) AS used FROM workspaces WHERE id=$1', [workspace],
      )).rows[0]
      if (!quota || (action === 'issue' && Number(quota.used) >= quota.maximum)) throw new Error('Workspace unavailable or audit capacity reached')
      let id: string
      let changed = true
      if (action === 'issue') {
        const active = await client.query<{ count: string }>('SELECT count(*) FROM collector_credentials WHERE workspace_id=$1', [workspace])
        // Includes expired/revoked rows: lifetime storage is bounded until a reviewed cleanup policy exists.
        if (Number(active.rows[0].count) >= 32) throw new Error('Credential capacity reached')
        id = randomUUID()
        const token = newCollectorToken()
        const result = await client.query<{ expires_at: Date }>(
          `INSERT INTO collector_credentials (id, workspace_id, source, token_hash, expires_at)
           VALUES ($1,$2,$3,$4,now()+$5::int * interval '1 hour') RETURNING expires_at`,
          [id, workspace, input.source, collectorTokenHash(token), ttl],
        )
        const file = await open(requiredEnv('SENTINEL_COLLECTOR_OUTPUT'), 'wx', 0o600)
        try {
          await file.writeFile(JSON.stringify({ id, source: input.source, token, expiresAt: result.rows[0].expires_at.toISOString() }) + '\n')
          await file.sync()
        } finally { await file.close() }
      } else {
        id = input.id as string
        const result = await client.query('UPDATE collector_credentials SET revoked_at=now() WHERE workspace_id=$1 AND id=$2 AND revoked_at IS NULL RETURNING id', [workspace, id])
        if (!result.rowCount) {
          if (!(await client.query('SELECT 1 FROM collector_credentials WHERE workspace_id=$1 AND id=$2', [workspace, id])).rowCount) throw new Error('Collector not found')
          changed = false
        }
      }
      // Emergency revocation may exceed nominal audit quota once per lifetime credential (at most32).
      if (changed) await client.query('INSERT INTO audit_entries (id,workspace_id,action,actor,resource_id,details) VALUES ($1,$2,$3,$4,$5,$6::jsonb)',
        [randomUUID(), workspace, action === 'issue' ? 'collector.issued' : 'collector.revoked', 'maintenance', id, JSON.stringify(action === 'issue' ? { source: input.source } : {})])
      await client.query('COMMIT')
      process.stdout.write('Collector operator action completed. Secret values were not printed.\n')
    } catch {
      await client.query('ROLLBACK').catch(() => {})
      throw new Error('Collector action failed; inspect private configuration and capacity. An output file from a failed issue is not an active credential.')
    } finally { client.release() }
  } finally { await pool.end() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runCollectorOperator(process.argv[2]).catch(() => {
    process.stderr.write('Collector action failed. Check private input, permissions and capacity; secret values are never printed.\n')
    process.exitCode = 1
  })
}
