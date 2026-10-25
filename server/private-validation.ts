import { isIP } from "node:net";
import type { EventInput, EventQuery } from "./data-model.js";

export const MAX_BODY_BYTES = 256 * 1024;
export const MAX_BATCH_EVENTS = 100;
export const MAX_PAGE_LIMIT = 100;
export const DEFAULT_PAGE_LIMIT = 50;
export const MAX_TIME_RANGE_MS = 31 * 24 * 60 * 60 * 1000;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ValidationError extends Error {
  constructor() {
    super("Request could not be validated");
    this.name = "ValidationError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/** Accept a real RFC 3339 timestamp with explicit offset, rejecting calendar rollovers. */
export function parseRfc3339(value: string): number | null {
  if (value.length > 35) return null;
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|([+-])(\d{2}):(\d{2}))$/.exec(
      value,
    );
  if (!match) return null;
  const [
    ,
    yearRaw,
    monthRaw,
    dayRaw,
    hourRaw,
    minuteRaw,
    secondRaw,
    ,
    zone,
    ,
    offsetHourRaw,
    offsetMinuteRaw,
  ] = match;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw);
  const offsetHour = Number(offsetHourRaw ?? 0);
  const offsetMinute = Number(offsetMinuteRaw ?? 0);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays =
    month === 2
      ? leap
        ? 29
        : 28
      : [4, 6, 9, 11].includes(month)
        ? 30
        : month >= 1 && month <= 12
          ? 31
          : 0;
  if (
    year === 0 ||
    day < 1 ||
    day > monthDays ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    offsetHour > 23 ||
    offsetMinute > 59
  )
    return null;
  if (zone === "Z" && value.endsWith("z")) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function parseEventQuery(
  params: URLSearchParams,
  now = Date.now(),
): EventQuery {
  const allowed = new Set([
    "q",
    "source",
    "severity",
    "from",
    "to",
    "limit",
    "cursor",
  ]);
  for (const key of new Set(params.keys())) {
    if (!allowed.has(key) || params.getAll(key).length !== 1)
      throw new ValidationError();
  }
  const q = params.get("q") ?? undefined;
  const source = params.get("source") ?? undefined;
  const severityRaw = params.get("severity") ?? undefined;
  const severity = severityRaw?.toLowerCase();
  const fromRaw = params.get("from") ?? undefined;
  const toRaw = params.get("to") ?? undefined;
  const limitRaw = params.get("limit") ?? undefined;
  const cursor = params.get("cursor") ?? undefined;
  const fromMs =
    fromRaw === undefined ? now - 24 * 60 * 60 * 1000 : parseRfc3339(fromRaw);
  const toMs = toRaw === undefined ? now : parseRfc3339(toRaw);
  const limit = limitRaw === undefined ? DEFAULT_PAGE_LIMIT : Number(limitRaw);
  if (
    (q !== undefined && (q.length === 0 || q.length > 120)) ||
    (source !== undefined && (source.length === 0 || source.length > 80)) ||
    (severity !== undefined && !["high", "medium", "low"].includes(severity)) ||
    (limitRaw !== undefined &&
      (!/^\d+$/.test(limitRaw) ||
        !Number.isSafeInteger(limit) ||
        limit < 1 ||
        limit > MAX_PAGE_LIMIT)) ||
    fromMs === null ||
    toMs === null ||
    fromMs > toMs ||
    toMs - fromMs > MAX_TIME_RANGE_MS ||
    (cursor !== undefined && (cursor.length === 0 || cursor.length > 256))
  )
    throw new ValidationError();

  return {
    ...(q !== undefined ? { q } : {}),
    ...(source !== undefined ? { source } : {}),
    ...(severity !== undefined
      ? { severity: severity as EventQuery["severity"] }
      : {}),
    from: new Date(fromMs).toISOString(),
    to: new Date(toMs).toISOString(),
    limit,
    ...(cursor !== undefined ? { cursor } : {}),
  };
}

const EVENT_FIELDS = new Set([
  "eventId",
  "timestamp",
  "event",
  "source",
  "host",
  "user",
  "srcIp",
  "severity",
  "outcome",
  "attributes",
  "raw",
]);
function boundedString(
  value: unknown,
  max: number,
  required = false,
): value is string {
  return (
    typeof value === "string" &&
    value.length <= max &&
    (!required || value.trim().length > 0)
  );
}

function validateAttributes(
  value: unknown,
): value is NonNullable<EventInput["attributes"]> {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  return (
    entries.length <= 32 &&
    new TextEncoder().encode(JSON.stringify(value)).byteLength <= 16_384 &&
    entries.every(
      ([key, item]) =>
        key.length > 0 &&
        key.length <= 64 &&
        (item === null ||
          typeof item === "boolean" ||
          (typeof item === "number" && Number.isFinite(item)) ||
          boundedString(item, 1024)),
    )
  );
}

function validateEvent(value: unknown): value is EventInput {
  if (
    !isRecord(value) ||
    Object.keys(value).some((key) => !EVENT_FIELDS.has(key))
  )
    return false;
  const timestamp = value.timestamp;
  return (
    boundedString(value.eventId, 128, true) &&
    boundedString(timestamp, 35, true) &&
    parseRfc3339(timestamp) !== null &&
    boundedString(value.event, 500, true) &&
    boundedString(value.source, 80, true) &&
    boundedString(value.host, 255, true) &&
    (value.user === undefined || boundedString(value.user, 255)) &&
    (value.srcIp === undefined ||
      (boundedString(value.srcIp, 45, true) && isIP(value.srcIp) !== 0)) &&
    (value.severity === "high" ||
      value.severity === "medium" ||
      value.severity === "low") &&
    (value.outcome === undefined || boundedString(value.outcome, 80)) &&
    (value.attributes === undefined || validateAttributes(value.attributes)) &&
    (value.raw === undefined || (boundedString(value.raw, 16_384) && new TextEncoder().encode(value.raw).byteLength <= 32_768))
  );
}

export function parseEventBatch(value: unknown): EventInput[] {
  if (
    !isRecord(value) ||
    Object.keys(value).length !== 1 ||
    !Array.isArray(value.events) ||
    value.events.length < 1 ||
    value.events.length > MAX_BATCH_EVENTS ||
    !value.events.every(validateEvent)
  ) {
    throw new ValidationError();
  }
  return value.events.map((event: EventInput) => ({ ...event, timestamp: new Date(event.timestamp).toISOString() }));
}

export type CaseCreateInput = {
  title: string;
  note: string;
  findingId?: string;
};
export function parseCaseCreate(value: unknown): CaseCreateInput {
  if (
    !isRecord(value) ||
    Object.keys(value).some(
      (key) => !["title", "note", "findingId"].includes(key),
    )
  )
    throw new ValidationError();
  if (
    !boundedString(value.title, 200, true) ||
    !boundedString(value.note, 4_000)
  )
    throw new ValidationError();
  if (
    value.findingId !== undefined &&
    (typeof value.findingId !== "string" || !isUuid(value.findingId))
  )
    throw new ValidationError();
  return {
    title: value.title,
    note: value.note,
    ...(typeof value.findingId === "string"
      ? { findingId: value.findingId }
      : {}),
  };
}

export type CasePatchInput = { note?: string; status?: "open" | "closed" };
export function parseCasePatch(value: unknown): CasePatchInput {
  if (
    !isRecord(value) ||
    Object.keys(value).length === 0 ||
    Object.keys(value).some((key) => !["note", "status"].includes(key))
  )
    throw new ValidationError();
  if (value.note !== undefined && !boundedString(value.note, 4_000))
    throw new ValidationError();
  if (
    value.status !== undefined &&
    value.status !== "open" &&
    value.status !== "closed"
  )
    throw new ValidationError();
  return {
    ...(typeof value.note === "string" ? { note: value.note } : {}),
    ...(value.status === "open" || value.status === "closed"
      ? { status: value.status }
      : {}),
  };
}
