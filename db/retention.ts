import { randomUUID } from 'node:crypto'
import { createAdminPool, localInsecureFromEnv, requiredEnv } from './admin-connection.js'

const MAX_DELETE_PER_RUN = 5000
const workspaceId = requiredEnv('SENTINEL_WORKSPACE_ID')
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) {
  throw new Error('SENTINEL_WORKSPACE_ID must be a UUID')
}
const args = process.argv.slice(2)
if (args.some((arg) => arg !== '--apply') || args.length > 1) throw new Error('Use no arguments for a dry run or pass --apply to delete eligible events')
const apply = args.includes('--apply')
const pool = createAdminPool(requiredEnv('DATABASE_ADMIN_URL'), localInsecureFromEnv('DATABASE_ADMIN_ALLOW_LOCAL_INSECURE'))

try {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.workspace_id', $1, true)", [workspaceId])
    if (apply) await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 74203031))', [workspaceId])
    const snapshot = await client.query<{
      cutoff: Date
      retention_days: number
      eligible: string
      held: string
    }>(
      `WITH workspace AS (
         SELECT id, retention_days, now() - make_interval(days => retention_days) AS cutoff
           FROM workspaces WHERE id = $1
       )
       SELECT w.cutoff, w.retention_days,
              count(*) FILTER (WHERE e.received_at < w.cutoff AND NOT EXISTS (
                SELECT 1 FROM findings f JOIN cases c ON c.workspace_id = f.workspace_id AND c.finding_id = f.id
                 WHERE f.workspace_id = e.workspace_id AND f.event_uuid = e.id
              )) AS eligible,
              count(*) FILTER (WHERE e.received_at < w.cutoff AND EXISTS (
                SELECT 1 FROM findings f JOIN cases c ON c.workspace_id = f.workspace_id AND c.finding_id = f.id
                 WHERE f.workspace_id = e.workspace_id AND f.event_uuid = e.id
              )) AS held
         FROM workspace w LEFT JOIN events e ON e.workspace_id = w.id
        GROUP BY w.cutoff, w.retention_days`,
      [workspaceId],
    )
    if (snapshot.rowCount === 0) throw new Error('Configured workspace was not found')
    const row = snapshot.rows[0]
    let deleted = 0
    let remaining = Number(row.eligible)
    if (apply) {
      const auditCapacity = await client.query<{ used: string; maximum: number }>('SELECT (SELECT count(*) FROM audit_entries WHERE workspace_id=$1) AS used, max_audit_entries AS maximum FROM workspaces WHERE id=$1',[workspaceId])
      if (Number(auditCapacity.rows[0].used)>=auditCapacity.rows[0].maximum) throw new Error('Audit capacity reached; review workspace capacity before applying retention')
      const result = await client.query<{ id: string }>(
        `WITH candidates AS (
           SELECT e.id FROM events e
            WHERE e.workspace_id = $1 AND e.received_at < $2
              AND NOT EXISTS (
                SELECT 1 FROM findings f JOIN cases c ON c.workspace_id = f.workspace_id AND c.finding_id = f.id
                 WHERE f.workspace_id = e.workspace_id AND f.event_uuid = e.id
              )
            ORDER BY e.received_at, e.id
            LIMIT $3 FOR UPDATE SKIP LOCKED
         )
         DELETE FROM events e USING candidates c
          WHERE e.workspace_id = $1 AND e.id = c.id
         RETURNING e.id`,
        [workspaceId, row.cutoff, MAX_DELETE_PER_RUN],
      )
      deleted = result.rowCount ?? 0
      remaining = Math.max(0, Number(row.eligible) - deleted)
      await client.query(
        `INSERT INTO audit_entries (id, workspace_id, action, actor, details)
         VALUES ($1, $2, 'retention.applied', 'maintenance', $3::jsonb)`,
        [randomUUID(), workspaceId, JSON.stringify({ deletedEvents: deleted, remainingEligibleEvents: remaining, heldEvents: Number(row.held), cutoff: row.cutoff.toISOString() })],
      )
    }
    await client.query('COMMIT')
    const result = {
      mode: apply ? 'applied' : 'dry-run',
      cutoff: row.cutoff.toISOString(),
      retentionDays: row.retention_days,
      eligibleEvents: Number(row.eligible),
      heldEvents: Number(row.held),
      deletedEvents: deleted,
      remainingEligibleEvents: remaining,
      maxDeletesPerRun: MAX_DELETE_PER_RUN,
    }
    process.stdout.write(`${JSON.stringify(result)}\n`)
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    if (error instanceof Error && /^(Configured workspace|Audit capacity)/.test(error.message)) throw error
    throw new Error('Retention operation failed; database details were suppressed')
  } finally {
    client.release()
  }
} catch (error) {
  const message = error instanceof Error && /^(Configured workspace|Audit capacity|Use no arguments|SENTINEL_WORKSPACE_ID)/.test(error.message)
    ? error.message
    : 'Retention operation failed; verify private admin configuration and server availability'
  process.stderr.write(`${message}\n`)
  process.exitCode = 1
} finally {
  await pool.end()
}
