# Graylog-informed Sentinel work

Created2026-11-02. All tickets are **Backlog / proposed**; research is complete for this slice, implementation is not. Owner for engineering: Codex; owner approval of supported source, workload and production policy remains with the product owner. These are local Markdown tickets, not GitHub Issues. Sprint names indicate dependency order, not delivery dates.

Research and pinned upstream licenses: [Graylog architecture review](../brain/01-Research/Graylog%20Architecture%20Review.md). Parent tickets: [commercial backlog](SPRINT-BACKLOG.md). No upstream code is approved for import. The public/private Finance split remains independent and must precede publishing the current local branch.

## Collection sprint

### GRAY-001 — Prove one collector path [P1]

- Parents: SEN-1001-A/B/C. Depends on agreed SEN-1009-A/C scope/budgets and source-scoped credential lifecycle.
- Scope: select one maintained collector with pinned version/license/advisory evidence; map a synthetic Linux-auth record to the current bounded JSON contract. GELF is an optional adapter spike, not the default API contract.
- Accept: ingest-only credential cannot read cases or override its workspace/source; expiration/revocation and spoofing negatives pass. Valid sample becomes searchable. Malformed/oversized/unsupported input fails predictably without exposing secrets. No direct database credentials on collectors.
- Candidate code: `server/private-api.ts`, `server/private-validation.ts`, `server/data-model.ts`, new adapter module after selection. Version existing API or add an explicitly documented contract; do not silently reinterpret existing clients.

### GRAY-002 — Demonstrate delivery and source health [P0]

- Parents: SEN-1001-C/D, SEN-208C-2. Depends on GRAY-001 and agreed resource budgets.
- Scope: define the durable acceptance point; bound spool/retries, use backoff/jitter, deduplicate stable event IDs, expose last receipt, lag, rejected records and overload. Specify conflicting same-ID payload handling and source scope.
- Accept: crash before/after commit, lost response/retry, duplicate delivery, database outage, full spool and revocation have reproducible results. Distinguish rejected data from accepted pending work; no infinite retry or silent drop. Acknowledge only at the documented durable point. UI distinguishes idle/stale/unavailable from connected/healthy and fits mobile/keyboard/themes.
- Candidate code: `server/storage/postgres-store.ts`, collector adapter and private source UI. Do not introduce Kafka/Kubernetes solely to emulate Graylog; select added infrastructure only if measured needs justify it.

## Processing and investigation sprint

### GRAY-003 — Preview one safe normalization pipeline [P1]

- Parents: SEN-1001-A/C, SEN-1003-A. Depends on source identity and a versioned data contract.
- Scope: immutable parser revision, allowlisted transforms, bounded field/cardinality limits, redaction policy and logical stream tags. Preview changes on synthetic records before activation; audit activation/rollback. Preserve provenance under an explicit raw-data privacy policy.
- Accept: valid/invalid Unicode, absent fields, timestamp offsets, late arrivals and adversarial payload fixtures. Processing failures enter a bounded access-controlled quarantine with retry/expiry policy. No arbitrary code, unbounded regex, network enrichment or dropped errors. Reprocessing does not silently rewrite historical finding provenance. Stream tags cannot grant access or change tenant identity.
- Candidate code: new `server/processing/` pure modules, versioned persistence migration only once the contract is reviewed, existing detection/storage integration. Default to current libraries; add a parser dependency only with evidence.

### GRAY-004 — Persist reusable investigation views [P1]

- Related: SEN-1002-A/C investigation/reporting and SEN-208B-1 permissions. Saved views are a new extension, not an already-defined case ticket. Depends on confirmed existing search/evidence contract.
- Scope: saved time/field/source filters with owner/sharing scope; choose a stream, inspect event, pivot to matching finding/case. Retain Sentinel's own event/finding vocabulary rather than copying upstream definitions.
- Accept: refresh preserves the saved configuration, not a frozen result set; current authorization applies on each use/share/export. Invalid/stale filters and unavailable results have clear states. Search remains bounded and parameterized; cross-workspace/role denial and accessible responsive UI verified.

### GRAY-005 — Separate findings from notification delivery [P0]

- Parents: SEN-1003-B/C and SEN-1004-A/B. Depends on existing identity/roles and selected detection scheduling contract.
- Scope: versioned detection evidence plus durable bounded outbox; lease/retry/expiry, suppression reason and expiry, delivery failure visibility. Start with an approved local mock destination. Keep evidence when notifications fail or are suppressed.
- Accept: restart/concurrent worker/replay cannot lose the recorded finding; retries are idempotent to the documented extent and duplicates are disclosed. SSRF, redirects/DNS rebinding, credential/log leakage and unauthorized destination changes covered before external webhooks. No real Slack/email destination configured by this ticket.

## Content and supported packaging sprint

### GRAY-006 — Ship an authored integration pack and reproducible lab [P1]

- Parents: SEN-1001-A, SEN-1003-A, SEN-210-1. Depends on GRAY-001/003 and licensed authored fixtures.
- Scope: one Linux-auth pack with manifest/schema/version/license/provenance, parsing mappings, detection revisions, learning notes, saved views and benign/malicious fixtures. Import is data-only with strict size/schema/version/ownership validation and an inspectable change preview. Provide a Sentinel-specific local lab with synthetic data and no private config.
- Accept: clean install/import/uninstall/upgrade/rollback on the supported topology; conflicts and unsupported versions fail safely; secrets are not exported. Tests reproduce known matches and benign controls; no blanket coverage claim. Review per-file notices before any Apache-2.0 wrapper reuse; no SSPL server/sidecar or commercial pack copied. Images/dependencies need their own license/security pins. Signed artifacts and production assessment remain SEN-210/212 gates.

## Evidence record

2026-11-02: inspected upstream organization/docs and exact LICENSE revisions; inspected current canonical event API/storage and existing ticket dependencies. Added research and scoped tickets only. No package installed, runtime code changed, tests run, issue created, branch pushed, database altered or site deployed. Do not mark these tickets Done from this planning record.

### Implementation continuation — 2026-11-02

GRAY-001 / SEN-1001-B: **Partial / local implementation in review**. Added opt-in ingest-only API, offline issue/revoke, hashed32-byte random tokens, immutable source/workspace binding, expiry, persistent per-credential request counters and collector-attributed audit. Existing account/operator routes reject collector keys. Runtime cannot issue/rebind/extend/revoke keys. Source spoofing and revocation between grant and storage are rejected. A Node HTTP sample command sends an authored synthetic record and creates the existing experimental VC-002 finding. This is a connectivity tool, not a selected maintained log collector; GRAY-001 remains open for collector choice/mapping and broader source/role/workload acceptance.

GRAY-002: **Partial** acknowledgement/deduplication and resource-bound foundation.202 follows transactional persistence; replay reports duplicates. Eight in-flight requests per gateway,256KiB actual byte limit, ten-second body deadline and database-backed10/min credential allowance are implemented. Sender spool/retry, outage/restart loss accounting, quarantine, source-health UI and service-wide resource controls remain open. No journal/HA/capacity claim.

Recovery/security review: restored collector credentials are revoked by default. Emergency revoke remains available when audit quota is full; at most one extra audit per lifetime credential (maximum32), with repeated revoke idempotent. Dashboard labels issued/revoked actions and collector actor accurately. No new dependencies or upstream code. Operational setup/rotation/rollback/limits: [COLLECTORS.md](../COLLECTORS.md).

Verification: regular build;52 unit/API/config tests; two disposable PostgreSQL integration tests including real HTTP sample/ingestion/isolation/expiry/quota/revocation checks;25 identity regression results (without identity browser flag); two encrypted backup/recovery tests passed. Dedicated actual-database browser review passed five checks for action/actor labels and desktop/mobile fit;1440px/320px screenshots visually inspected. Report: [collector-foundation.json](../audit/collector-foundation.json). No production/preserved-lab migration, public build, GitHub push/CI or Site deployment. Existing Finance source/history must still be separated before publishing this branch. Remaining GRAY tickets are Backlog.
