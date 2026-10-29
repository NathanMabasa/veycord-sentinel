/** Server-only portable contracts. No credentials or customer fixtures belong here. */
export type SeverityLevel = 'high' | 'medium' | 'low'
export type EventInput = {
  eventId: string
  timestamp: string
  event: string
  source: string
  host: string
  user?: string
  srcIp?: string
  severity: SeverityLevel
  outcome?: string
  attributes?: Record<string, string | number | boolean | null>
  raw?: string
}
export type DetectionMatch = {
  ruleId: string
  /** Null/omitted for legacy or manually supplied findings; never infer from the current catalog. */
  ruleVersion?: string | null
  name: string
  severity: SeverityLevel
  techniqueId: string
  reason: string
  evidence: string[]
}
export type StoredEvent = EventInput & { id: string; receivedAt: string }
export type StoredFinding = DetectionMatch & { id: string; eventId: string; timestamp: string; host: string; status: 'new' | 'investigating' | 'resolved' }
export type StoredCase = { id: string; title: string; note: string; status: 'open' | 'closed'; findingId: string | null; createdAt: string; updatedAt: string }
export type EventQuery = { q?: string; source?: string; severity?: SeverityLevel; from: string; to: string; limit: number; cursor?: string }
export type PageResult<T> = { data: T[]; nextCursor: string | null }
export type StoreSummary = { eventCount: number; findingCount: number; openCaseCount: number; latestEventAt: string | null }
export interface DataStore {
  ping(): Promise<void>
  summary(): Promise<StoreSummary>
  ingest(events: EventInput[], matches: DetectionMatch[][]): Promise<{ accepted: number; duplicates: number; findings: number }>
  listEvents(query: EventQuery): Promise<PageResult<StoredEvent>>
  listFindings(limit: number): Promise<StoredFinding[]>
  listCases(limit: number): Promise<StoredCase[]>
  createCase(input: { title: string; note: string; findingId?: string }): Promise<StoredCase>
  updateCase(id: string, patch: { note?: string; status?: 'open' | 'closed' }): Promise<StoredCase | null>
  analytics(): Promise<WorkspaceAnalytics>
  operations(): Promise<OperationsStatus>
  listAudit(limit: number): Promise<AuditEntry[]>
  close(): Promise<void>
}

export type WorkspaceLimits = { maxEvents: number; maxEventBytes: number; maxCases: number; maxAuditEntries: number; retentionDays: number }
export type OperationsStatus = {
  limits: WorkspaceLimits
  usage: { eventCount: number; eventBytes: number; caseCount: number; auditCount: number }
  retention: { cutoff: string; eligibleEvents: number; heldEvents: number }
}
export type AuditEntry = {
  id: string
  occurredAt: string
  action: 'events.ingested' | 'case.created' | 'case.updated' | 'retention.applied' | 'limits.updated'
  actor: 'operator-service' | 'maintenance' | 'user'
  resourceId: string | null
  details: Record<string, string | number | boolean | null>
}
export type WorkspaceAnalytics = {
  from: string
  to: string
  buckets: { timestamp: string; count: number }[]
  sources: { source: string; count: number }[]
  severities: { severity: SeverityLevel; count: number }[]
}
