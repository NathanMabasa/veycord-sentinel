# Private API

`server/private-api.ts` provides a protected, single-workspace API for a trusted operator service. It is separate from the public local synthetic demo API in `server/app.ts`. Do not expose this API publicly or use the shared service credential as an interactive user login.

## Authentication and scope

Every route under `/api/private/v1` requires `Authorization: Bearer <token>`. The configured token must be a cryptographically random base64url string of 43–128 characters. Generate a deployment secret with an operating-system CSPRNG (for example, `openssl rand -base64 32 | tr '+/' '-_' | tr -d '=\n'`) and pass it through the private runtime configuration. There is no default token. The API never accepts credentials in a URL and does not log or echo credentials.

The service credential grants operator access to one trusted workspace selected by the `DataStore` configuration. Requests cannot choose a workspace. This is not multi-tenant authorization, interactive identity, analyst RBAC, or per-user audit attribution. Keep the service private, protect the secret, and use TLS on any network hop. The API adds no CORS allowance; mutation requests with an `Origin` header must be same-origin.

## Routes

All successful responses use a `{ "data": ... }` envelope. Event-list responses add `page.nextCursor`.

| Method  | Path                        | Behavior                                                                  |
| ------- | --------------------------- | ------------------------------------------------------------------------- |
| `GET`   | `/api/private/v1/health`    | Authenticated store ping; reports availability only.                      |
| `GET`   | `/api/private/v1/summary`   | Event, finding, open-case counts and latest event timestamp.              |
| `GET`   | `/api/private/v1/operations` | Configured limits, current usage, and retention eligibility/hold counts. |
| `GET`   | `/api/private/v1/audit`     | Latest 100 audit entries for the configured workspace.                    |
| `GET`   | `/api/private/v1/events`    | Search stored events.                                                     |
| `POST`  | `/api/private/v1/events`    | Validate a batch, evaluate deterministic starter detections, then ingest. |
| `GET`   | `/api/private/v1/findings`  | List at most 100 findings.                                                |
| `GET`   | `/api/private/v1/cases`     | List at most 100 cases.                                                   |
| `POST`  | `/api/private/v1/cases`     | Create a case with a title, analyst note, and optional finding UUID.      |
| `PATCH` | `/api/private/v1/cases/:id` | Update a case note and/or `open`/`closed` status by UUID.                 |

### Event search

Supported query parameters are `q`, `source`, `severity`, `from`, `to`, `limit`, and `cursor`. Unknown or repeated parameters are rejected. `from` and `to` default to the previous 24 hours and current time; both are validated RFC 3339 timestamps when supplied, and the range is capped at 31 days. `q` is at most 120 characters, `source` at most 80 characters, and `limit` defaults to 50 with a maximum of 100. The cursor is opaque store pagination state and is capped at 256 characters. Reuse the exact explicit from/to and other filters on subsequent pages; changed filters invalidate the cursor.

### Event ingestion

The request is JSON of the form `{ "events": [ ... ] }`. The batch must contain 1–100 events and the complete body must not exceed 256 KiB. Unknown event fields are rejected. Each event has a non-empty event ID (128 characters max), valid RFC 3339 timestamp, event name (500 max), source (80 max), host (255 max), severity (`high`, `medium`, or `low`), optional user (255 max), optional IP address, optional outcome (80 max), optional raw text (16,384 UTF-16 code units and 32 KiB UTF-8 max, also subject to the 256 KiB body cap), and optional flat `attributes` object (32 keys max; keys 64 characters and string values 1,024 characters max, 16 KiB total serialized UTF-8 attributes). Attributes accept only finite numbers, strings, booleans, or null. Detection evaluation uses the repository's deterministic rules; event payloads are never executed as code or rules.

### Cases

Case creation accepts exactly `title`, `note`, and optional UUID `findingId`. `title` is non-empty and at most 200 characters; `note` is a string (empty is allowed) of at most 4,000 characters. Patches accept a non-empty subset of `note` and `status`. Client workspace fields are rejected.

### Operations and audit

Both read routes accept no query parameters and operate on the workspace selected by the trusted store configuration. Operations values are reported by the store; event bytes are stored event payload bytes. `eligibleEvents` counts records past the reported retention cutoff, while `heldEvents` counts records excluded from cleanup by an active hold. Eligibility does not mean cleanup has run. Audit responses contain at most 100 newest entries. The service records the shared actor as `operator-service`; it cannot attribute actions to individual people. Audit details are bounded metadata and are not a substitute for externally anchored audit storage.

## Limits and errors

The API applies per-process fixed-window limits of 60 authenticated reads per minute, 10 ingests per minute, and 10 case writes per minute. It returns `429` with `Retry-After` when limited. The buckets are in-memory and reset on restart; they are not distributed quotas and do not protect a multi-instance deployment. The body limit applies before JSON parsing. Responses use `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer`.

Errors use a stable safe envelope: `{ "error": { "code": "...", "message": "..." } }`. The API uses `400` for validation, `401` for authentication, `403` for a foreign mutation origin, `404` for missing resources/routes, `405` for unsupported methods, `409` with `QUOTA_EXCEEDED` when a configured workspace storage limit prevents a write, `413` for oversized bodies, `429` for rate limits, `503` for store failures, and a generic `500` for unexpected errors. Internal errors and credentials are not returned. When a quota response occurs, check `/operations` for current usage and retention eligibility, then have the local operator adjust the configured limit or retention policy before retrying.

## Deployment and security gaps

This private API is not a claim of production readiness or multi-tenant support. The service key has no rotation endpoint, role separation, user attribution, or fine-grained authorization. The per-process limits do not coordinate across instances. Before real telemetry is exposed, deployment must add secret management and rotation, TLS and network restrictions, tenant authorization if multi-tenant, audit, retention/deletion, durable quotas, operational monitoring, and independent security review. Follow the gates in the product brain; do not claim compliance or government approval from this implementation.

## Batch 003 operations contract

- `GET /api/private/v1/analytics`: fixed server-derived preceding24h window, exclusive upper bound, 24 one-hour buckets aligned to `from`, top10 sources and high/medium/low totals. All query parameters are rejected. This reports received stored events by event timestamp, not total network coverage or a health score.
- `GET /api/private/v1/operations`: configured event/byte/case/audit capacities, current usage, received-time retention eligibility and case holds. Logical event bytes exclude PostgreSQL overhead and other record types.
- `GET /api/private/v1/audit`: newest100 scoped operational records; runtime cannot edit/delete them. No per-user attribution is implied.

Quota violations use409 and roll back the mutation and its audit together. Defaults and administrator commands are in [operations](OPERATIONS.md). Event UI ranges are1h/24h/7d/30d; API event range remains capped at31d. Public `/api/v1` stays synthetic and unauthenticated.
