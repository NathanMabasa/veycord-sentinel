import { Hono, type Context } from 'hono'
import { demoEvents, detections as demoDetections } from '../src/data/demo.js'

const API_PREFIX = '/api/v1'
const MAX_LIMIT = 100
const DEFAULT_LIMIT = 50
const MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000
const SEVERITIES = new Set(['high', 'medium', 'low'])
const ALLOWED_QUERY = new Set(['q', 'source', 'severity', 'from', 'to', 'limit', 'cursor'])

const events = demoEvents.map((event) => ({
  id: event.id,
  timestamp: new Date(event.timestamp).toISOString(),
  source: event.source,
  host: event.host,
  event: event.event,
  severity: event.severity.toLowerCase(),
  outcome: event.outcome,
  fields: { user: event.user, sourceIp: event.srcIp, detail: event.detail, raw: event.raw },
}))

const detections = demoDetections.map(({ id, name, category, severity, description, rationale, next, eventId }) => ({
  id,
  name,
  category,
  severity: severity.toLowerCase(),
  description,
  rationale,
  nextStep: next,
  eventId,
}))

type Filters = { q?: string; source?: string; severity?: string; from?: number; to?: number }

function error(c: Context, status: 400 | 404 | 405 | 500, code: string, message: string) {
  return c.json({ error: { code, message } }, status)
}

function parseDate(value: string | undefined): number | undefined | null {
  if (value === undefined) return undefined
  const match = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.(\d{1,3}))?(Z|([+-])(\d\d):(\d\d))$/.exec(value)
  if (value.length > 35 || !match) return null
  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, , , , offsetHourRaw, offsetMinuteRaw] = match
  const year = Number(yearRaw)
  const month = Number(monthRaw)
  const day = Number(dayRaw)
  const hour = Number(hourRaw)
  const minute = Number(minuteRaw)
  const second = Number(secondRaw)
  const offsetHour = Number(offsetHourRaw ?? 0)
  const offsetMinute = Number(offsetMinuteRaw ?? 0)
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = month === 2 ? (isLeapYear ? 29 : 28)
    : [4, 6, 9, 11].includes(month) ? 30
      : month >= 1 && month <= 12 ? 31 : 0
  if (
    year === 0 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59 ||
    offsetHour > 23 || offsetMinute > 59
  ) return null
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : null
}

function encodeCursor(offset: number): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, offset }))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
}

function decodeCursor(value: string | undefined): number | null {
  if (value === undefined) return 0
  if (value.length > 64 || !/^[A-Za-z0-9_-]+$/.test(value)) return null
  try {
    const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/'))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (typeof parsed !== 'object' || parsed === null || !('v' in parsed) || !('offset' in parsed)) return null
    const cursor = parsed as { v: unknown; offset: unknown }
    return cursor.v === 1 && Number.isSafeInteger(cursor.offset) && Number(cursor.offset) >= 0 && Number(cursor.offset) <= events.length
      ? Number(cursor.offset)
      : null
  } catch {
    return null
  }
}

function createApp(registerBeforeFallback?: (app: Hono) => void) {
const app = new Hono()

app.use('*', async (c, next) => {
  await next()
  c.header('Cache-Control', 'no-store')
  c.header('X-Content-Type-Options', 'nosniff')
  c.header('Referrer-Policy', 'no-referrer')
})

app.get(`${API_PREFIX}/health`, (c) => c.json({ status: 'ok', mode: 'synthetic-demo', authenticated: false }))

app.get(`${API_PREFIX}/events`, (c) => {
  const params = new URL(c.req.url).searchParams
  for (const key of new Set(params.keys())) {
    if (!ALLOWED_QUERY.has(key) || params.getAll(key).length !== 1) return error(c, 400, 'INVALID_ARGUMENT', 'Request could not be validated')
  }
  const q = params.get('q') ?? undefined
  const source = params.get('source') ?? undefined
  const severityRaw = params.get('severity') ?? undefined
  const severity = severityRaw?.toLowerCase()
  const limitRaw = params.get('limit') ?? undefined
  const from = parseDate(params.get('from') ?? undefined)
  const to = parseDate(params.get('to') ?? undefined)
  const cursorRaw = params.get('cursor') ?? undefined
  const offset = decodeCursor(cursorRaw)
  if (
    (q !== undefined && (q.length === 0 || q.length > 120)) ||
    (source !== undefined && (source.length === 0 || source.length > 80)) ||
    (severity !== undefined && !SEVERITIES.has(severity)) ||
    (limitRaw !== undefined && (!Number.isInteger(Number(limitRaw)) || Number(limitRaw) < 1 || Number(limitRaw) > MAX_LIMIT)) ||
    from === null || to === null ||
    (from !== undefined && to !== undefined && (from > to || to - from > MAX_RANGE_MS)) ||
    offset === null
  ) return error(c, 400, 'INVALID_ARGUMENT', 'Request could not be validated')

  const limit = limitRaw === undefined ? DEFAULT_LIMIT : Number(limitRaw)
  const filters: Filters = { q: q?.toLowerCase(), source, severity, from, to }
  const matched = events.filter((event) => {
    if (filters.source && event.source !== filters.source) return false
    if (filters.severity && event.severity !== filters.severity) return false
    if (filters.from !== undefined && Date.parse(event.timestamp) < filters.from) return false
    if (filters.to !== undefined && Date.parse(event.timestamp) > filters.to) return false
    if (filters.q && !`${event.id} ${event.event} ${event.source} ${event.host} ${JSON.stringify(event.fields)}`.toLowerCase().includes(filters.q)) return false
    return true
  })
  const page = matched.slice(offset, offset + limit)
  const nextOffset = offset + page.length
  return c.json({ data: page, page: { nextCursor: nextOffset < matched.length ? encodeCursor(nextOffset) : null } })
})

app.get(`${API_PREFIX}/events/:id`, (c) => {
  const event = events.find((item) => item.id === c.req.param('id'))
  return event ? c.json({ data: event }) : error(c, 404, 'NOT_FOUND', 'Event not found')
})

app.get(`${API_PREFIX}/detections`, (c) => c.json({ data: detections }))

registerBeforeFallback?.(app)

app.all(`${API_PREFIX}/*`, (c) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    c.header('Allow', 'GET, HEAD')
    return error(c, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  }
  return error(c, 404, 'NOT_FOUND', 'API route not found')
})

app.notFound((c) => {
  if (c.req.path === API_PREFIX || c.req.path.startsWith(`${API_PREFIX}/`)) return error(c, 404, 'NOT_FOUND', 'API route not found')
  return c.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404)
})

app.onError((_err, c) => error(c, 500, 'INTERNAL_ERROR', 'The request could not be completed'))

return app
}

const app = createApp()
export { app, createApp }
export default app
