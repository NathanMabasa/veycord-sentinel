# Veycord Sentinel API v1

**Status: implemented synthetic read-only slice.** `server/app.ts` exports the shared Hono app and its Fetch-compatible `app.fetch` entry point. Vite development and preview middleware dispatch `/api/v1` requests to that same app. The API reads only deterministic synthetic fixtures from `src/data/demo.ts`; it is not connected to users, tenants, storage, or customer telemetry.

This API is unauthenticated and exists for local demo integration. `GET /api/v1/health` reports `mode: "synthetic-demo"` and `authenticated: false`. Do not use it with real telemetry or treat it as a hosted service. No CORS headers are enabled. Responses carry `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.

## Implemented endpoints

All responses are UTF-8 JSON. Only `GET` and `HEAD` are supported. Unknown API paths return JSON 404 and unsupported methods return JSON 405; `/api/v1` requests do not fall through to the SPA.

| Method | Path | Purpose | Status |
|---|---|---|---|
| `GET`, `HEAD` | `/api/v1/health` | Synthetic demo mode and unauthenticated status | Implemented |
| `GET`, `HEAD` | `/api/v1/events` | Bounded fixture search and pagination | Implemented |
| `GET`, `HEAD` | `/api/v1/events/:id` | Read one fixture event | Implemented |
| `GET`, `HEAD` | `/api/v1/detections` | List fixture detection metadata | Implemented |
| `POST` | `/api/v1/ingest` | Ingest events | Not implemented |
| `GET` | `/api/v1/alerts` | List authorized findings/alerts | Not implemented |
| `POST` | `/api/v1/cases` | Create a case | Not implemented |

## Event search

`GET /api/v1/events?q=PowerShell&source=Windows%20Security&severity=high&from=2026-10-23T00:00:00Z&to=2026-10-24T00:00:00Z&limit=50`

Supported query parameters are `q`, `source`, `severity`, `from`, `to`, `limit`, and `cursor`. Unknown or repeated parameters are rejected. `q` is a case-insensitive substring match over the fixed fixture fields (maximum 120 characters). `source` must be 1–80 characters. `severity` is `high`, `medium`, or `low`. Time values must be RFC 3339 with an explicit timezone; if both are given, `from` must not exceed `to` and their range cannot exceed 31 days. `limit` defaults to 50 and must be 1–100. Search runs over a fixed eight-event fixture set, so this limit bounds response size rather than a database query.

The cursor is an opaque, unsigned pagination position for this in-memory fixture list. It is not an authorization token, is not bound to a filter set, and provides no database snapshot guarantees. Clients should pass it back unchanged and discard it if filters change.

```json
{
  "data": [{
    "id": "evt-7f21a0",
    "timestamp": "2026-10-23T07:42:18.000Z",
    "source": "Windows Security",
    "host": "FIN-WS-042",
    "event": "PowerShell launched with encoded command",
    "severity": "high",
    "outcome": "Success",
    "fields": { "user": "j.mokoena", "sourceIp": "192.0.2.42", "detail": "…", "raw": "…" }
  }],
  "page": { "nextCursor": null }
}
```

`GET /api/v1/events/:id` responds as `{ "data": event }`. `GET /api/v1/detections` responds as `{ "data": [...] }`. A missing event ID returns a generic 404 without exposing additional lookup information.

## Errors

Validation errors use a stable, non-sensitive envelope:

```json
{ "error": { "code": "INVALID_ARGUMENT", "message": "Request could not be validated" } }
```

Unknown API paths return `NOT_FOUND`; unsupported methods return `METHOD_NOT_ALLOWED` with `Allow: GET, HEAD`. Unexpected handler failures return the generic `INTERNAL_ERROR` 500 response. Errors do not include stack traces or raw query details. Security headers are also applied to error responses.

## Future hosted API requirements

This synthetic slice does not meet the security or release gates for real data. Before a hosted or self-hosted real-data API is exposed, implement and review authentication, server-side tenant/object authorization, body and query bounds, quotas, persistence, audit, retention and deletion, and cross-tenant isolation tests. Derive workspace identity from trusted credentials. Never accept a client-supplied tenant ID as authorization. Do not advertise compliance, production readiness, or hosted real-data support until the brain's technical, tenant security, privacy, and operations gates have evidence.

`server/app.ts` is a Worker-compatible module entry: a Worker can export `{ fetch: app.fetch }` using Hono's documented module Worker form. The repository does not currently include a Worker deployment configuration, bindings, persistence, authentication, or a publish/deploy workflow; none is claimed here.

## Verification

Run `npm run test:api` for direct Fetch-contract tests against `app.fetch`. The repository build checks TypeScript and produces the Vite frontend bundle with `npm run build`.
