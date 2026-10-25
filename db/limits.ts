import { randomUUID } from 'node:crypto'
import { createAdminPool, localInsecureFromEnv, requiredEnv } from './admin-connection.js'

const workspaceId = requiredEnv('SENTINEL_WORKSPACE_ID')
if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceId)) throw new Error('Configured workspace UUID is invalid')
const fields = {
  '--max-events': { name: 'maxEvents', min: 1, max: 100_000_000 },
  '--max-event-bytes': { name: 'maxEventBytes', min: 1, max: 1_099_511_627_776 },
  '--max-audit-entries': { name: 'maxAuditEntries', min: 1, max: 10_000_000 },
  '--max-cases': { name: 'maxCases', min: 1, max: 1_000_000 },
  '--retention-days': { name: 'retentionDays', min: 1, max: 3650 },
} as const
const overrides: Record<string, number> = {}
let apply = false
const args = process.argv.slice(2)
for (let i = 0; i < args.length; i++) {
  const flag = args[i]
  if (flag === '--apply' && !apply) { apply = true; continue }
  if (!(flag in fields)) throw new Error('Unknown or repeated limit option')
  const spec = fields[flag as keyof typeof fields]
  const value = args[++i]
  if (spec.name in overrides || !value || !/^\d+$/.test(value)) throw new Error('Limit values must be bounded positive integers')
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number < spec.min || number > spec.max) throw new Error('Limit value is outside the supported range')
  overrides[spec.name] = number
}
if (apply && Object.keys(overrides).length === 0) throw new Error('Supply at least one limit change with --apply')
const pool = createAdminPool(requiredEnv('DATABASE_ADMIN_URL'), localInsecureFromEnv('DATABASE_ADMIN_ALLOW_LOCAL_INSECURE'))
try {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('app.workspace_id', $1, true)", [workspaceId])
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 74203031))', [workspaceId])
    const result = await client.query<{ max_events: string; max_event_bytes: string; max_cases: number; max_audit_entries: number; retention_days: number }>('SELECT max_events,max_event_bytes,max_cases,max_audit_entries,retention_days FROM workspaces WHERE id=$1', [workspaceId])
    if (!result.rows[0]) throw new Error('Configured workspace was not found')
    const row = result.rows[0]
    const before = { maxEvents: Number(row.max_events), maxEventBytes: Number(row.max_event_bytes), maxCases: row.max_cases, maxAuditEntries: row.max_audit_entries, retentionDays: row.retention_days }
    const next = { ...before, ...overrides }
    const usageResult = await client.query<{ events: string; bytes: string; cases: string; audits: string }>(`SELECT (SELECT count(*) FROM events WHERE workspace_id=$1) AS events, (SELECT COALESCE(sum(quota_bytes),0) FROM events WHERE workspace_id=$1) AS bytes, (SELECT count(*) FROM cases WHERE workspace_id=$1) AS cases, (SELECT count(*) FROM audit_entries WHERE workspace_id=$1) AS audits`, [workspaceId])
    const usage = usageResult.rows[0]
    if (next.maxEvents < Number(usage.events) || next.maxEventBytes < Number(usage.bytes) || next.maxCases < Number(usage.cases) || next.maxAuditEntries < Number(usage.audits) || (apply && next.maxAuditEntries <= Number(usage.audits))) throw new Error('Proposed limits are below current usage; review retention before reducing capacity')
    if (apply) {
      await client.query('UPDATE workspaces SET max_events=$2,max_event_bytes=$3,max_cases=$4,retention_days=$5,max_audit_entries=$6 WHERE id=$1', [workspaceId,next.maxEvents,next.maxEventBytes,next.maxCases,next.retentionDays,next.maxAuditEntries])
      await client.query(`INSERT INTO audit_entries(id,workspace_id,action,actor,details) VALUES($1,$2,'limits.updated','maintenance',$3::jsonb)`, [randomUUID(),workspaceId,JSON.stringify({ ...Object.fromEntries(Object.entries(before).map(([k,v])=>[`previous_${k}`,v])), ...next })])
    }
    await client.query('COMMIT')
    process.stdout.write(JSON.stringify({ mode: apply ? 'applied' : 'dry-run', before, proposed: next, deletionPerformed: false })+'\n')
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{})
    if (error instanceof Error && /^(Configured workspace|Proposed limits)/.test(error.message)) throw error
    throw new Error('Workspace limits operation failed; private database details were suppressed')
  } finally { client.release() }
} catch (error) {
  process.stderr.write((error instanceof Error && /^(Configured workspace|Proposed limits)/.test(error.message) ? error.message : 'Workspace limits operation failed; check private administrator configuration')+'\n')
  process.exitCode=1
} finally { await pool.end() }
