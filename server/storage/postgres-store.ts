import { createHash, randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import type {
  DataStore,
  DetectionMatch,
  EventInput,
  EventQuery,
  PageResult,
  WorkspaceAnalytics,
  OperationsStatus,
  AuditEntry,
  SeverityLevel,
  StoreSummary,
  StoredCase,
  StoredEvent,
  StoredFinding,
} from '../data-model.js'

const MAX_BATCH = 200
const MAX_BATCH_BYTES = 1_048_576
const MAX_BATCH_FINDINGS = 1000
const MAX_PAGE = 100
const SEVERITIES = new Set<SeverityLevel>(['high', 'medium', 'low'])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const DATA_TABLES = ['workspaces', 'events', 'findings', 'cases', 'audit_entries']

export class StoreInputError extends Error {
  constructor(message = 'Storage input is invalid') {
    super(message)
    this.name = 'StoreInputError'
  }
}

export class StoreNotFoundError extends Error {
  constructor(message = 'Record not found') {
    super(message)
    this.name = 'StoreNotFoundError'
  }
}

export class StorageOperationError extends Error {
  constructor() {
    super('Database operation failed')
    this.name = 'StorageOperationError'
  }
}

export class StoreQuotaError extends Error {
  constructor() {
    super('Workspace quota exceeded')
    this.name = 'StoreQuotaError'
  }
}

type PgEventRow = {
  id: string
  event_id: string
  timestamp: Date
  received_at: Date
  event: string
  source: string
  host: string
  event_user: string | null
  src_ip: string | null
  severity: SeverityLevel
  outcome: string | null
  attributes: Record<string, string | number | boolean | null>
  raw: string | null
}

type PgFindingRow = {
  id: string
  rule_id: string
  name: string
  severity: SeverityLevel
  technique_id: string
  reason: string
  evidence: string[]
  status: StoredFinding['status']
  event_id: string
  timestamp: Date
  host: string
}

type PgCaseRow = {
  id: string
  title: string
  note: string
  status: StoredCase['status']
  finding_id: string | null
  created_at: Date
  updated_at: Date
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

function validateInstant(value: string): boolean {
  const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,3})?(Z|([+-])(\d\d):(\d\d))$/.exec(value)
  if (!match) return false
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, , , offsetHourRaw, offsetMinuteRaw] = match
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const days = month === 2 ? (isLeap ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30
      : month >= 1 && month <= 12 ? 31 : 0
  return year > 0 && day >= 1 && day <= days && Number(hourRaw) <= 23 && Number(minuteRaw) <= 59 &&
    Number(secondRaw) <= 59 && Number(offsetHourRaw ?? 0) <= 23 && Number(offsetMinuteRaw ?? 0) <= 59 &&
    Number.isFinite(Date.parse(value))
}

function boundedString(value: unknown, label: string, max: number, required = true): string | undefined {
  if (value === undefined || value === null) {
    if (required) throw new StoreInputError(`${label} is required`)
    return undefined
  }
  if (typeof value !== 'string' || (required && value.trim().length === 0) || value.length > max) {
    throw new StoreInputError(`${label} is invalid`)
  }
  return value
}

function validateEvent(event: EventInput): void {
  if (!event || typeof event !== 'object') throw new StoreInputError()
  boundedString(event.eventId, 'eventId', 200)
  boundedString(event.event, 'event', 500)
  boundedString(event.source, 'source', 128)
  boundedString(event.host, 'host', 255)
  boundedString(event.user, 'user', 255, false)
  boundedString(event.srcIp, 'srcIp', 80, false)
  boundedString(event.outcome, 'outcome', 80, false)
  if (!validateInstant(event.timestamp) || !SEVERITIES.has(event.severity)) throw new StoreInputError()
  if (event.raw !== undefined && (typeof event.raw !== 'string' || Buffer.byteLength(event.raw, 'utf8') > 32768)) throw new StoreInputError()
  if (event.attributes !== undefined) {
    if (!event.attributes || typeof event.attributes !== 'object' || Array.isArray(event.attributes)) throw new StoreInputError()
    const entries = Object.entries(event.attributes)
    let attributesBytes: number
    try {
      attributesBytes = Buffer.byteLength(JSON.stringify(event.attributes), 'utf8')
    } catch {
      throw new StoreInputError()
    }
    if (entries.length > 64 || attributesBytes > 16384) throw new StoreInputError()
    for (const [key, value] of entries) {
      if (key.length === 0 || key.length > 128 || !['string', 'number', 'boolean', 'object'].includes(typeof value)) throw new StoreInputError()
      if (typeof value === 'string' && value.length > 2048) throw new StoreInputError()
      if (typeof value === 'number' && !Number.isFinite(value)) throw new StoreInputError()
      if (value !== null && typeof value === 'object') throw new StoreInputError()
    }
  }
}

function validateMatch(match: DetectionMatch): void {
  if (!match || typeof match !== 'object') throw new StoreInputError()
  boundedString(match.ruleId, 'ruleId', 120)
  boundedString(match.name, 'name', 200)
  boundedString(match.techniqueId, 'techniqueId', 40)
  boundedString(match.reason, 'reason', 1000)
  if (!SEVERITIES.has(match.severity) || !Array.isArray(match.evidence) || match.evidence.length > 20) throw new StoreInputError()
  let evidenceSize = 0
  for (const evidence of match.evidence) {
    boundedString(evidence, 'evidence', 2000)
    evidenceSize += Buffer.byteLength(evidence, 'utf8')
  }
  if (evidenceSize > 16000) throw new StoreInputError()
}

function encodeCursor(timestamp: Date, id: string, fingerprint: string): string {
  return Buffer.from(JSON.stringify({ v: 1, timestamp: timestamp.toISOString(), id, fingerprint }), 'utf8').toString('base64url')
}

function decodeCursor(value: string | undefined, fingerprint: string): { timestamp: string; id: string } | null {
  if (value === undefined) return null
  if (value.length > 1000 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new StoreInputError('Cursor is invalid')
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>
    if (parsed.v !== 1 || typeof parsed.timestamp !== 'string' || !validateInstant(parsed.timestamp) ||
      typeof parsed.id !== 'string' || !isUuid(parsed.id) || parsed.fingerprint !== fingerprint) throw new Error()
    return { timestamp: parsed.timestamp, id: parsed.id }
  } catch {
    throw new StoreInputError('Cursor is invalid')
  }
}

function eventFromRow(row: PgEventRow): StoredEvent {
  return {
    id: row.id,
    eventId: row.event_id,
    timestamp: row.timestamp.toISOString(),
    receivedAt: row.received_at.toISOString(),
    event: row.event,
    source: row.source,
    host: row.host,
    ...(row.event_user === null ? {} : { user: row.event_user }),
    ...(row.src_ip === null ? {} : { srcIp: row.src_ip }),
    severity: row.severity,
    ...(row.outcome === null ? {} : { outcome: row.outcome }),
    attributes: row.attributes,
    ...(row.raw === null ? {} : { raw: row.raw }),
  }
}

function findingFromRow(row: PgFindingRow): StoredFinding {
  return {
    id: row.id,
    ruleId: row.rule_id,
    name: row.name,
    severity: row.severity,
    techniqueId: row.technique_id,
    reason: row.reason,
    evidence: row.evidence,
    eventId: row.event_id,
    timestamp: row.timestamp.toISOString(),
    host: row.host,
    status: row.status,
  }
}

function caseFromRow(row: PgCaseRow): StoredCase {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    status: row.status,
    findingId: row.finding_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }
}

function makePoolOptions(connectionString: string, allowLocalInsecure: boolean) {
  let parsed: URL
  try {
    parsed = new URL(connectionString)
  } catch {
    throw new Error('Database connection configuration is invalid')
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') throw new Error('Database connection configuration is invalid')
  const host = parsed.hostname.toLowerCase()
  const isLoopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
  const sslmode = parsed.searchParams.get('sslmode')
  if (parsed.searchParams.has('sslcert') || parsed.searchParams.has('sslkey') || parsed.searchParams.has('sslrootcert')) {
    throw new Error('Database TLS settings must use the platform trust store')
  }
  let ssl: false | { rejectUnauthorized: true }
  if (sslmode === 'verify-full') {
    ssl = { rejectUnauthorized: true }
    parsed.searchParams.delete('sslmode')
  } else if (isLoopback && allowLocalInsecure && (sslmode === null || sslmode === 'disable')) {
    ssl = false
    parsed.searchParams.delete('sslmode')
  } else {
    throw new Error('Remote PostgreSQL requires sslmode=verify-full; local plaintext requires allowLocalInsecure=true')
  }
  return {
    connectionString: parsed.toString(),
    ssl,
    max: 5,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    statement_timeout: 5000,
    query_timeout: 7000,
    keepAlive: true,
  }
}

export class PostgresStore implements DataStore {
  private readonly pool: Pool
  private readonly workspaceId: string

  constructor(options: { connectionString: string; workspaceId: string; allowLocalInsecure?: boolean }) {
    if (!options || typeof options.connectionString !== 'string' || !isUuid(options.workspaceId)) {
      throw new Error('Storage configuration is invalid')
    }
    this.workspaceId = options.workspaceId
    try {
      this.pool = new Pool(makePoolOptions(options.connectionString, options.allowLocalInsecure === true))
      this.pool.on('error', () => {})
    } catch {
      throw new Error('Database connection configuration is invalid')
    }
  }

  private async withWorkspace<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect().catch(() => { throw new StorageOperationError() })
    let inTransaction = false
    try {
      await client.query('BEGIN')
      inTransaction = true
      await this.assertRuntimeRole(client)
      await client.query("SELECT set_config('app.workspace_id', $1, true)", [this.workspaceId])
      const result = await operation(client)
      await client.query('COMMIT')
      inTransaction = false
      return result
    } catch (cause) {
      if (inTransaction) await client.query('ROLLBACK').catch(() => {})
      if (cause instanceof StoreInputError || cause instanceof StoreNotFoundError || cause instanceof StoreQuotaError || cause instanceof StorageOperationError) throw cause
      throw new StorageOperationError()
    } finally {
      client.release()
    }
  }

  private async assertRuntimeRole(client: PoolClient): Promise<void> {
    const result = await client.query<{ role_name: string; superuser: boolean; bypass_rls: boolean; owns_data: boolean }>(
      `SELECT current_user AS role_name,
              r.rolsuper AS superuser,
              r.rolbypassrls AS bypass_rls,
              EXISTS (
                SELECT 1 FROM pg_class c
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public'
                  AND c.relname = ANY($1::text[])
                  AND c.relowner = r.oid
              ) AS owns_data
         FROM pg_roles r WHERE r.rolname = current_user`,
      [DATA_TABLES],
    )
    const role = result.rows[0]
    if (!role || role.role_name !== 'sentinel_app' || role.superuser || role.bypass_rls || role.owns_data) {
      throw new StorageOperationError()
    }
  }

  private async lockWorkspaceWrites(client: PoolClient): Promise<void> {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1::text, 74203031))', [this.workspaceId])
  }

  private async getWorkspaceLimits(client: PoolClient): Promise<{ maxEvents: number; maxEventBytes: number; maxCases: number; maxAuditEntries: number; retentionDays: number }> {
    const result = await client.query<{ max_events: string; max_event_bytes: string; max_cases: number; max_audit_entries: number; retention_days: number }>(
      `SELECT max_events, max_event_bytes, max_cases, max_audit_entries, retention_days FROM workspaces WHERE id = $1`,
      [this.workspaceId],
    )
    const row = result.rows[0]
    if (!row) throw new StorageOperationError()
    return { maxEvents: Number(row.max_events), maxEventBytes: Number(row.max_event_bytes), maxCases: row.max_cases, maxAuditEntries: row.max_audit_entries, retentionDays: row.retention_days }
  }

  private async appendAudit(
    client: PoolClient,
    action: AuditEntry['action'],
    actor: AuditEntry['actor'],
    resourceId: string | null,
    details: AuditEntry['details'],
  ): Promise<void> {
    const capacity = await client.query<{ used: string; maximum: number }>(
      'SELECT (SELECT count(*) FROM audit_entries WHERE workspace_id=$1) AS used, max_audit_entries AS maximum FROM workspaces WHERE id=$1', [this.workspaceId],
    )
    if (!capacity.rows[0] || Number(capacity.rows[0].used) >= capacity.rows[0].maximum) throw new StoreQuotaError()
    await client.query(
      `INSERT INTO audit_entries (id, workspace_id, action, actor, resource_id, details)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [randomUUID(), this.workspaceId, action, actor, resourceId, JSON.stringify(details)],
    )
  }

  async ping(): Promise<void> {
    await this.withWorkspace(async (client) => { await client.query('SELECT 1') })
  }

  async summary(): Promise<StoreSummary> {
    return this.withWorkspace(async (client) => {
      const result = await client.query<{
        event_count: string
        finding_count: string
        open_case_count: string
        latest_event_at: Date | null
      }>(
        `SELECT (SELECT count(*) FROM events WHERE workspace_id = $1) AS event_count,
                (SELECT count(*) FROM findings WHERE workspace_id = $1) AS finding_count,
                (SELECT count(*) FROM cases WHERE workspace_id = $1 AND status = 'open') AS open_case_count,
                (SELECT max(timestamp) FROM events WHERE workspace_id = $1) AS latest_event_at`,
        [this.workspaceId],
      )
      const row = result.rows[0]
      return {
        eventCount: Number(row.event_count),
        findingCount: Number(row.finding_count),
        openCaseCount: Number(row.open_case_count),
        latestEventAt: row.latest_event_at?.toISOString() ?? null,
      }
    })
  }

  async ingest(events: EventInput[], matches: DetectionMatch[][]): Promise<{ accepted: number; duplicates: number; findings: number }> {
    if (!Array.isArray(events) || events.length > MAX_BATCH || !Array.isArray(matches) || matches.length !== events.length) throw new StoreInputError()
    let batchBytes = 0
    let batchFindingCount = 0
    events.forEach((event, index) => {
      validateEvent(event)
      try {
        batchBytes += Buffer.byteLength(JSON.stringify(event), 'utf8')
      } catch {
        throw new StoreInputError()
      }
      if (!Array.isArray(matches[index]) || matches[index].length > 20) throw new StoreInputError()
      matches[index].forEach(validateMatch)
      batchFindingCount += matches[index].length
      batchBytes += Buffer.byteLength(JSON.stringify(matches[index]), 'utf8')
    })
    if (batchBytes > MAX_BATCH_BYTES || batchFindingCount > MAX_BATCH_FINDINGS) throw new StoreInputError()
    return this.withWorkspace(async (client) => {
      await this.lockWorkspaceWrites(client)
      const limits = await this.getWorkspaceLimits(client)
      const usage = await client.query<{ event_count: string; event_bytes: string }>(
        `SELECT count(*) AS event_count, COALESCE(sum(quota_bytes), 0) AS event_bytes FROM events WHERE workspace_id = $1`,
        [this.workspaceId],
      )
      let eventCount = Number(usage.rows[0].event_count)
      let eventBytes = Number(usage.rows[0].event_bytes)
      let accepted = 0
      let duplicates = 0
      let findings = 0
      let acceptedBytes = 0
      for (let index = 0; index < events.length; index += 1) {
        const input = events[index]
        const inserted = await client.query<{ id: string; quota_bytes: string }>(
          `INSERT INTO events (id, workspace_id, event_id, timestamp, event, source, host, event_user, src_ip, severity, outcome, attributes, raw, quota_bytes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13,
             octet_length(jsonb_build_object(
               'eventId', $3::varchar,
               'timestamp', to_char($4 AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
               'event', $5::varchar, 'source', $6::varchar, 'host', $7::varchar, 'user', $8::varchar, 'srcIp', $9::varchar,
               'severity', $10::varchar, 'outcome', $11::varchar, 'attributes', $12::jsonb, 'raw', $13::text
             )::text))
           ON CONFLICT (workspace_id, source, event_id) DO NOTHING
           RETURNING id, quota_bytes`,
          [randomUUID(), this.workspaceId, input.eventId, input.timestamp, input.event, input.source, input.host,
            input.user ?? null, input.srcIp ?? null, input.severity, input.outcome ?? null,
            JSON.stringify(input.attributes ?? {}), input.raw ?? null],
        )
        if (inserted.rowCount === 0) {
          duplicates += 1
          continue
        }
        const bytes = Number(inserted.rows[0].quota_bytes)
        if (eventCount + 1 > limits.maxEvents || eventBytes + bytes > limits.maxEventBytes) throw new StoreQuotaError()
        eventCount += 1
        eventBytes += bytes
        acceptedBytes += bytes
        accepted += 1
        for (const match of matches[index]) {
          const finding = await client.query(
            `INSERT INTO findings (id, workspace_id, event_uuid, rule_id, name, severity, technique_id, reason, evidence)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
             ON CONFLICT (workspace_id, event_uuid, rule_id) DO NOTHING`,
            [randomUUID(), this.workspaceId, inserted.rows[0].id, match.ruleId, match.name, match.severity,
              match.techniqueId, match.reason, JSON.stringify(match.evidence)],
          )
          findings += finding.rowCount ?? 0
        }
      }
      if (accepted > 0) await this.appendAudit(client, 'events.ingested', 'operator-service', null, { accepted, duplicates, findings, bytes: acceptedBytes })
      return { accepted, duplicates, findings }
    })
  }

  async listEvents(query: EventQuery): Promise<PageResult<StoredEvent>> {
    if (!query || !validateInstant(query.from) || !validateInstant(query.to) || Date.parse(query.from) > Date.parse(query.to) ||
      Date.parse(query.to) - Date.parse(query.from) > 31 * 24 * 60 * 60 * 1000 || !Number.isInteger(query.limit) || query.limit < 1 || query.limit > MAX_PAGE) {
      throw new StoreInputError()
    }
    if (query.q !== undefined && (query.q.length === 0 || query.q.length > 120)) throw new StoreInputError()
    if (query.source !== undefined) boundedString(query.source, 'source', 128)
    if (query.severity !== undefined && !SEVERITIES.has(query.severity)) throw new StoreInputError()
    const filters = { q: query.q ?? null, source: query.source ?? null, severity: query.severity ?? null, from: query.from, to: query.to }
    const fingerprint = createHash('sha256').update(JSON.stringify(filters)).digest('base64url')
    const cursor = decodeCursor(query.cursor, fingerprint)
    return this.withWorkspace(async (client) => {
      const conditions = ['workspace_id = $1', 'timestamp >= $2::timestamptz', 'timestamp <= $3::timestamptz']
      const values: unknown[] = [this.workspaceId, query.from, query.to]
      if (query.source !== undefined) {
        values.push(query.source)
        conditions.push(`source = $${values.length}`)
      }
      if (query.severity !== undefined) {
        values.push(query.severity)
        conditions.push(`severity = $${values.length}`)
      }
      if (query.q !== undefined) {
        values.push(query.q.toLowerCase())
        conditions.push(`position($${values.length} in lower(concat_ws(' ', event, source, host, event_user, src_ip, outcome, attributes::text, raw))) > 0`)
      }
      if (cursor) {
        values.push(cursor.timestamp, cursor.id)
        conditions.push(`(timestamp, id) < ($${values.length - 1}::timestamptz, $${values.length}::uuid)`)
      }
      values.push(query.limit + 1)
      const result = await client.query<PgEventRow>(
        `SELECT id, event_id, timestamp, received_at, event, source, host, event_user, src_ip, severity, outcome, attributes, raw
           FROM events WHERE ${conditions.join(' AND ')}
           ORDER BY timestamp DESC, id DESC LIMIT $${values.length}`,
        values,
      )
      const hasMore = result.rows.length > query.limit
      const rows = hasMore ? result.rows.slice(0, query.limit) : result.rows
      const last = rows.at(-1)
      return {
        data: rows.map(eventFromRow),
        nextCursor: hasMore && last ? encodeCursor(last.timestamp, last.id, fingerprint) : null,
      }
    })
  }

  async listFindings(limit: number): Promise<StoredFinding[]> {
    this.validateLimit(limit)
    return this.withWorkspace(async (client) => {
      const result = await client.query<PgFindingRow>(
        `SELECT f.id, f.rule_id, f.name, f.severity, f.technique_id, f.reason, f.evidence, f.status,
                e.event_id, e.timestamp, e.host
           FROM findings f JOIN events e ON e.workspace_id = f.workspace_id AND e.id = f.event_uuid
          WHERE f.workspace_id = $1 ORDER BY f.created_at DESC, f.id DESC LIMIT $2`,
        [this.workspaceId, limit],
      )
      return result.rows.map(findingFromRow)
    })
  }

  async listCases(limit: number): Promise<StoredCase[]> {
    this.validateLimit(limit)
    return this.withWorkspace(async (client) => {
      const result = await client.query<PgCaseRow>(
        `SELECT id, title, note, status, finding_id, created_at, updated_at
           FROM cases WHERE workspace_id = $1 ORDER BY updated_at DESC, id DESC LIMIT $2`,
        [this.workspaceId, limit],
      )
      return result.rows.map(caseFromRow)
    })
  }

  async analytics(): Promise<WorkspaceAnalytics> {
    return this.withWorkspace(async (client) => {
      const buckets = await client.query<{ from_at: Date; to_at: Date; bucket_at: Date; count: string }>(
        `WITH bounds AS (
           SELECT date_trunc('milliseconds', transaction_timestamp()) AS to_at,
                  date_trunc('milliseconds', transaction_timestamp()) - interval '24 hours' AS from_at
         ), bucket_numbers AS (
           SELECT generate_series(0, 23) AS bucket_number
         )
         SELECT b.from_at, b.to_at,
                b.from_at + n.bucket_number * interval '1 hour' AS bucket_at,
                count(e.id) AS count
           FROM bounds b CROSS JOIN bucket_numbers n
           LEFT JOIN events e ON e.workspace_id = $1
             AND e.timestamp >= b.from_at + n.bucket_number * interval '1 hour'
             AND e.timestamp < b.from_at + (n.bucket_number + 1) * interval '1 hour'
          GROUP BY b.from_at, b.to_at, n.bucket_number
          ORDER BY n.bucket_number`,
        [this.workspaceId],
      )
      const bounds = buckets.rows[0]
      if (!bounds) throw new StorageOperationError()
      const sources = await client.query<{ source: string; count: string }>(
        `WITH bounds AS (
           SELECT date_trunc('milliseconds', transaction_timestamp()) - interval '24 hours' AS from_at,
                  date_trunc('milliseconds', transaction_timestamp()) AS to_at
         )
         SELECT e.source, count(*) AS count
           FROM events e CROSS JOIN bounds b
          WHERE e.workspace_id = $1 AND e.timestamp >= b.from_at AND e.timestamp < b.to_at
          GROUP BY e.source
          ORDER BY count(*) DESC, e.source ASC
          LIMIT 10`,
        [this.workspaceId],
      )
      const severities = await client.query<{ severity: SeverityLevel; count: string }>(
        `WITH bounds AS (
           SELECT date_trunc('milliseconds', transaction_timestamp()) - interval '24 hours' AS from_at,
                  date_trunc('milliseconds', transaction_timestamp()) AS to_at
         ), levels(severity) AS (VALUES ('high'), ('medium'), ('low'))
         SELECT levels.severity, count(e.id) AS count
           FROM levels CROSS JOIN bounds b
           LEFT JOIN events e ON e.workspace_id = $1 AND e.severity = levels.severity
             AND e.timestamp >= b.from_at AND e.timestamp < b.to_at
          GROUP BY levels.severity
          ORDER BY CASE levels.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END`,
        [this.workspaceId],
      )
      return {
        from: bounds.from_at.toISOString(),
        to: bounds.to_at.toISOString(),
        buckets: buckets.rows.map((row) => ({ timestamp: row.bucket_at.toISOString(), count: Number(row.count) })),
        sources: sources.rows.map((row) => ({ source: row.source, count: Number(row.count) })),
        severities: severities.rows.map((row) => ({ severity: row.severity, count: Number(row.count) })),
      }
    })
  }

  async createCase(input: { title: string; note: string; findingId?: string }): Promise<StoredCase> {
    boundedString(input?.title, 'title', 200)
    boundedString(input?.note, 'note', 5000, false)
    if (input.findingId !== undefined && !isUuid(input.findingId)) throw new StoreInputError()
    return this.withWorkspace(async (client) => {
      await this.lockWorkspaceWrites(client)
      const limits = await this.getWorkspaceLimits(client)
      const usage = await client.query<{ case_count: string }>('SELECT count(*) AS case_count FROM cases WHERE workspace_id = $1', [this.workspaceId])
      if (Number(usage.rows[0].case_count) >= limits.maxCases) throw new StoreQuotaError()
      const result = await client.query<PgCaseRow>(
        `INSERT INTO cases (id, workspace_id, title, note, finding_id)
         SELECT $1, $2, $3, $4, $5::uuid
          WHERE $5::uuid IS NULL OR EXISTS (SELECT 1 FROM findings WHERE workspace_id = $2 AND id = $5::uuid)
         RETURNING id, title, note, status, finding_id, created_at, updated_at`,
        [randomUUID(), this.workspaceId, input.title, input.note ?? '', input.findingId ?? null],
      )
      if (result.rowCount === 0) throw new StoreNotFoundError()
      await this.appendAudit(client, 'case.created', 'operator-service', result.rows[0].id, { findingLinked: result.rows[0].finding_id !== null })
      return caseFromRow(result.rows[0])
    })
  }

  async updateCase(id: string, patch: { note?: string; status?: 'open' | 'closed' }): Promise<StoredCase | null> {
    if (!isUuid(id) || !patch || (patch.note === undefined && patch.status === undefined)) throw new StoreInputError()
    if (patch.note !== undefined) boundedString(patch.note, 'note', 5000, false)
    if (patch.status !== undefined && patch.status !== 'open' && patch.status !== 'closed') throw new StoreInputError()
    return this.withWorkspace(async (client) => {
      await this.lockWorkspaceWrites(client)
      const result = await client.query<PgCaseRow>(
        `UPDATE cases SET note = COALESCE($3, note), status = COALESCE($4, status), updated_at = now()
          WHERE workspace_id = $1 AND id = $2
         RETURNING id, title, note, status, finding_id, created_at, updated_at`,
        [this.workspaceId, id, patch.note ?? null, patch.status ?? null],
      )
      if (!result.rows[0]) return null
      await this.appendAudit(client, 'case.updated', 'operator-service', result.rows[0].id, {
        noteChanged: patch.note !== undefined,
        statusChanged: patch.status !== undefined,
        ...(patch.status === undefined ? {} : { status: patch.status }),
      })
      return caseFromRow(result.rows[0])
    })
  }

  async operations(): Promise<OperationsStatus> {
    return this.withWorkspace(async (client) => {
      const result = await client.query<{
        max_events: string
        max_event_bytes: string
        max_cases: number
        max_audit_entries: number
        audit_count: string
        retention_days: number
        event_count: string
        event_bytes: string
        case_count: string
        cutoff: Date
        eligible_events: string
        held_events: string
      }>(
        `WITH limits AS (
           SELECT id, max_events, max_event_bytes, max_cases, max_audit_entries, retention_days,
                  now() - make_interval(days => retention_days) AS cutoff
             FROM workspaces WHERE id = $1
         ), usage AS (
           SELECT (SELECT count(*) FROM events WHERE workspace_id = $1) AS event_count,
                  (SELECT COALESCE(sum(quota_bytes), 0) FROM events WHERE workspace_id = $1) AS event_bytes,
                  (SELECT count(*) FROM cases WHERE workspace_id = $1) AS case_count,
                  (SELECT count(*) FROM audit_entries WHERE workspace_id = $1) AS audit_count
         ), retention AS (
           SELECT count(*) FILTER (WHERE e.received_at < l.cutoff AND NOT EXISTS (
                    SELECT 1 FROM findings f JOIN cases c ON c.workspace_id = f.workspace_id AND c.finding_id = f.id
                     WHERE f.workspace_id = e.workspace_id AND f.event_uuid = e.id
                  )) AS eligible_events,
                  count(*) FILTER (WHERE e.received_at < l.cutoff AND EXISTS (
                    SELECT 1 FROM findings f JOIN cases c ON c.workspace_id = f.workspace_id AND c.finding_id = f.id
                     WHERE f.workspace_id = e.workspace_id AND f.event_uuid = e.id
                  )) AS held_events
             FROM events e CROSS JOIN limits l WHERE e.workspace_id = $1
         )
         SELECT l.max_events, l.max_event_bytes, l.max_cases, l.max_audit_entries, l.retention_days,
                u.event_count, u.event_bytes, u.case_count, u.audit_count, l.cutoff,
                r.eligible_events, r.held_events
           FROM limits l CROSS JOIN usage u CROSS JOIN retention r`,
        [this.workspaceId],
      )
      const row = result.rows[0]
      if (!row) throw new StorageOperationError()
      return {
        limits: { maxEvents: Number(row.max_events), maxEventBytes: Number(row.max_event_bytes), maxCases: row.max_cases, maxAuditEntries: row.max_audit_entries, retentionDays: row.retention_days },
        usage: { eventCount: Number(row.event_count), eventBytes: Number(row.event_bytes), caseCount: Number(row.case_count), auditCount: Number(row.audit_count) },
        retention: { cutoff: row.cutoff.toISOString(), eligibleEvents: Number(row.eligible_events), heldEvents: Number(row.held_events) },
      }
    })
  }

  async listAudit(limit: number): Promise<AuditEntry[]> {
    this.validateLimit(limit)
    return this.withWorkspace(async (client) => {
      const result = await client.query<{
        id: string
        occurred_at: Date
        action: AuditEntry['action']
        actor: AuditEntry['actor']
        resource_id: string | null
        details: AuditEntry['details']
      }>(
        `SELECT id, occurred_at, action, actor, resource_id, details FROM audit_entries
          WHERE workspace_id = $1 ORDER BY occurred_at DESC, id DESC LIMIT $2`,
        [this.workspaceId, limit],
      )
      return result.rows.map((row) => ({
        id: row.id,
        occurredAt: row.occurred_at.toISOString(),
        action: row.action,
        actor: row.actor,
        resourceId: row.resource_id,
        details: row.details,
      }))
    })
  }

  private validateLimit(limit: number): void {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE) throw new StoreInputError()
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}
