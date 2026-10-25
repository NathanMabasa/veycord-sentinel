# Product brain alignment audit

Reviewed 2026-10-24 against `server/app.ts`, `vite.config.ts`, `docs/API-v1.md`, and `src/App.tsx`. This note records the current implementation boundary; it is not a security assessment or production-readiness claim.

## Current implementation

- The React console and its normal investigation workflow use bundled synthetic fixtures from `src/data/demo.ts`. Search and overview metrics are local fixture operations.
- Browser-local state covers alert disposition, cases and notes, workspace preferences, saved searches, and theme. Case notes can be edited; cases can be closed/reopened and exported as JSON; a local guard prevents multiple cases per alert. Persisted values are shape-checked and bounded. If storage access or writes fail, the UI remains session-usable and indicates session-only behavior.
- `server/app.ts` exports a Hono app with `GET /api/v1/health`, `GET /api/v1/events`, `GET /api/v1/events/:id`, and `GET /api/v1/detections`. Requests serve a fixed synthetic fixture set; event search has bounded query parameters, time range, page size, and cursor. Other API routes/methods are rejected.
- `vite.config.ts` mounts this API in Vite development and preview middleware. A static-only site deployment does not carry that middleware. The repo has no Worker deployment configuration or publish/deploy workflow for this API.
- `docs/API-v1.md` is now the implementation-facing contract for the local read-only slice. It separately labels ingest, alerts/cases API endpoints as unimplemented and lists future hosted API requirements.

## Product-brain status

| Brain area | Current alignment |
|---|---|
| [[07-Decisions/Decision Register]] | Local React/Vite console and synthetic read-only Hono API are implemented. OpenSearch vs ClickHouse and the event schema remain undecided; Hono Worker deployment is not established. |
| [[09-Engineering/Build Map and Traceability]] | The local exploration and browser workflow are a partial analyst-experience slice. Ingestion, durable search, server-side alerts/cases, and release gates remain open. |
| [[09-Engineering/Framework Decision and Research Plan]] | Earlier “no API server exists yet” and “add the API skeleton next” notes are superseded by the current implementation status. Real-data vertical slice remains future work. |
| [[05-UX/First Run and Learning Path]] | Browser workflow and its persistence fallback are described as demo behavior only. |
| [[02-Architecture/Proposed Architecture]] and [[02-Architecture/Component Guide]] | Logical services describe the intended product architecture; they should not be read as implemented components. |

## Explicit gaps and constraints

- No real telemetry ingestion, authentication, identity, server-side authorization, tenant isolation, user/workspace service, backend alert/case persistence, audit trail, retention/deletion enforcement, or hosted real-data storage.
- The local API is unauthenticated and is not an authorization boundary. Its Worker-compatible Fetch shape is not evidence of a Cloudflare deployment.
- Browser localStorage is best-effort demo state, not secure or durable storage. Validation protects the UI from malformed values; it provides no confidentiality or access control.
- The API and UI use synthetic fixtures only. Do not send customer telemetry to this build or claim compliance, government approval, production readiness, or parity with mature SIEM products.
- Remaining work includes data-plane benchmarking, canonical event schema selection, threat-model and control mapping, ingestion and persistence design, authorization/isolation testing, privacy and operations evidence, and deployment/release review.

## Evidence locations

- [`API-v1.md`](../API-v1.md)
- [`server/app.ts`](../../server/app.ts)
- [`vite.config.ts`](../../vite.config.ts)
- [`src/App.tsx`](../../src/App.tsx)
- [`src/data/demo.ts`](../../src/data/demo.ts)
