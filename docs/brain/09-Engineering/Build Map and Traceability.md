# Build Map and Traceability

This is the implementation map from product brain to buildable work. Each feature links to its user job and security/architecture notes. Build vertical slices in dependency order so every phase leaves a demoable, reviewable result.

## Current implementation evidence (2026-10-24)

- **Public demo:** fixture console and read-only `/api/v1`, with browser-local demo state.
- **Private foundation:** `/workspace` and `/api/private/v1` through Node/Hono, enabled only with server configuration; PostgreSQL events/findings/cases, authenticated bounded ingestion, six deterministic rules, keyset event pages, runtime-role checks and forced workspace RLS. See [[../02-Architecture/Private Deployment Decision]], [[../03-Security/Detection Coverage]], `docs/PRIVATE-WORKSPACE.md` and batch 002 tickets.
- **Open gates:** interactive identity/roles and tenant membership, collectors/schema normalization, individual/external audit, privacy export/deletion, automatic retention, offsite/scheduled recovery, hosted deployment and high-volume benchmark. Scope and limitations are part of acceptance, not implied completed controls.

No production-readiness or real-telemetry approval is established by this foundation.

## Workstream A — Product foundation

1. Repo standards: license decision, README, contribution guide, security disclosure, code of conduct, release policy, support matrix.
2. Architecture records: hosted/self-hosted boundaries, data flow, event model, tenancy model, backend benchmark decision.
3. Demo fixtures: synthetic events with clear license and provenance.

References: [[Product Thesis]], [[Free and Open Source Model]], [[Project Operations]], [[Decision Register]].

## Workstream B — Event source to searchable data

1. Define versioned Veycord envelope and field mapping (timestamp + observed time, source, tenant, event category, raw payload pointer, normalized attributes, parser version).
2. Deploy a minimal OpenTelemetry Collector Contrib config with one local source and one OTLP path.
3. Add authenticated ingest credential issuance and revocation, request/batch bounds, quota accounting, durable acknowledgement behavior.
4. Queue events; parse/normalize with fixture coverage and malformed-event quarantine.
5. Implement search-backend adapter after [[Data Plane Decision and Benchmark]].
6. Add source health and ingest lag.

References: [[Component Guide]], [[Data and Detection Standards]], [[Threat Model Starter]], [[Security Requirements]].

## Workstream C — Analyst experience

1. Overview with source health, event rate, detections due, alerts needing triage, and case updates.
2. Explore: time range, text, filters, field panel, pagination, event detail, raw/normalized toggle, query plan/limit feedback.
3. Save a search; visualize it on a dashboard; create an alert from it.
4. Detection library: metadata, rule editor/import, mapping preview, validation, test, enable/pause state.
5. Alert review: why fired, evidence, related events, disposition, assign/acknowledge.
6. Case: timeline, notes, linked alerts/evidence, audit trail, export.

The public demo implements fixture exploration and local alert/case interactions. The private foundation adds durable findings/cases, paginated event search, fixed-window activity analytics and a mutation audit view. Detection authoring/scheduling, per-user audit and a case timeline remain pending.

References: [[Information Architecture]], [[Competitor Workflow Notes]], [[What Makes a Strong Splunk Alternative]], [[First Run and Learning Path]].

## Workstream D — Hosted tenancy and Cloudflare service

1. Workspace lifecycle, membership, roles, secure sessions and recovery.
2. Tenant boundary enforced in API and search adapter; cross-tenant isolation model written and reviewed.
3. Usage/retention quotas; safe reject/back-pressure semantics; cost budget alarms.
4. Export, deletion, archive/index/backup expiry coordination.
5. Data location and subprocessor disclosure; private beta operations runbook.

References: [[Web Hosting Strategy]], [[POPIA and Government Readiness]], [[Security Requirements]], [[Threat Model Starter]].

## Workstream E — Open source, operations, and career portfolio

1. GitHub releases with checksums/signatures and SBOM.
2. Local self-host install and demo path; backup/restore and upgrade runbook.
3. Detection-as-code CI: lint metadata, resolve license, map fields, execute positive/negative fixtures, report drift.
4. Public docs/landing page and synthetic demo.
5. Architecture diagrams, threat model, security control evidence matrix, benchmark report, known limitations.

References: [[Free and Open Source Model]], [[Project Operations]], [[Phased Roadmap]].

## Build order / dependencies

```text
Repo + threat model + synthetic fixture
       ↓
OTel collector → ingest auth/quota → queue → parser/normalize → measured backend
       ↓                                                  ↓
source health → search/explore → detections + tests → alerts → cases/export
       ↓                                                  ↓
hosted tenancy hardening + retention/deletion + operations evidence
       ↓
invited real-data pilot → independent security review → controlled availability
```

## Release gate matrix

| Gate | Minimum evidence | Blocks |
|---|---|---|
| Technical proof | Reproducible end-to-end synthetic vertical slice; backend benchmark | Backend commitment |
| Data integrity | Duplicate/retry/outage/late-event behavior documented and measured | Real-data pilot |
| Tenant security | Cross-tenant tests across API/search/export/queues/archive/jobs; independent review | Hosted customer telemetry |
| Privacy | Data inventory, retention/deletion proof, residency/subprocessor disclosure, POPIA terms review | Public hosted sign-up |
| Operations | Cost budgets, alerts, incident process, backup restore, recovery and quota behavior | Public hosted sign-up |
| Open-source release | License inventory, notices, SBOM, signed artifacts, security policy | Public release |

## Definition of done for any vertical slice

- User job is demonstrated end-to-end with synthetic fixtures.
- API and data schema are documented and versioned.
- Failure and degraded states appear in UI/metrics.
- Tenant authorization is explicit and server-side.
- Sensitive data is not exposed in logs, traces, analytics, or errors.
- Limitations, operational steps, and rollback are documented.
- Security impact and dependency/license impact are recorded.
