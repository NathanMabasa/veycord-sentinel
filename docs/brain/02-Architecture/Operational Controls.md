# Operational Controls

Accepted implementation boundary, 2026-10-24; D-018. Links: [[Private Deployment Decision]], [[../03-Security/Security Requirements]], [[../09-Engineering/Build Map and Traceability]].

## Responsibilities and data path

The Node/Hono gateway authenticates one operator service key and derives its workspace from server configuration. `PostgresStore` validates runtime-role privileges and opens parameterized transactions with a workspace setting and statement timeout. PostgreSQL forced RLS and composite workspace references guard accidental scope mistakes. Browser callers cannot choose a workspace. A holder of database credentials with arbitrary SQL can change that setting; this is not a multi-tenant identity boundary.

`GET /analytics` computes a fixed 24-hour histogram, top ten sources and severity totals from accepted event timestamps. Empty data remains empty. Event search independently supports 1-hour, 24-hour, 7-day and 30-day ranges, filters and stable keyset pages. Activity counts do not represent device health, prevented attacks or detection completeness.

## Capacity and mutation integrity

Defaults: 100,000 events, 100 MiB canonical accepted-event JSON, 1,000 cases including closed cases and 200,000 audit entries per workspace. The event byte counter is logical accounting; indexes, findings, WAL, backups and physical disk need independent monitoring. A transaction-scoped advisory lock serializes a workspace's ingest, case, limit and retention mutations across processes. Quota and audit failure roll back the entire mutation. Duplicate source/event IDs do not consume quota twice. Administrator-only `db/limits.ts` uses dry-run by default and rejects reductions below usage.

Audit entries contain allowlisted counts, IDs, statuses and change flags. The runtime can insert/read but cannot update/delete audit rows. `operator-service` is shared attribution; administrator modification and forged runtime inserts remain possible. External anchoring and individual identity are future controls.

## Retention and recovery

`db/retention.ts` defaults to dry-run. Explicit apply deletes at most 5,000 events older than the server-received-time cutoff. Any event connected through a finding to an open or closed case is held. A shared lock prevents case-creation/retention races. Audit capacity is checked before deletion. No scheduler, privacy deletion/export or backup expiry is implemented.

Local full-database backups use PostgreSQL custom dumps and AES-256-GCM with a separate random key, authenticated metadata and fresh nonce. Output has a 256 MiB cap, private file permissions and no-overwrite publication. Restore authenticates before invoking PostgreSQL, requires a trusted archive and empty target, upgrades known older Sentinel migrations and reapplies restricted runtime grants. A later migration/check failure quarantines the target. Encryption does not make source SQL trustworthy. No offsite schedule, key escrow, RPO/RTO commitment or remote-database backup support is established.

The standalone service uses compiled JavaScript and `.env.runtime` containing an explicit runtime allowlist. Administrative, restore and backup-key environment variables are refused in that dedicated process. Maintenance commands use separate credentials. Development Vite is not the production isolation boundary.

## Alternatives and remaining gates

PostgreSQL locking is preferred to an in-memory quota counter because separate gateway processes must share accounting. Native PostgreSQL tools are preferred to custom table serialization for recovery. Built-in Node crypto avoids an additional encryption package; key management remains operator responsibility. PostgreSQL remains the bounded prototype/control store pending measured SIEM workload comparison.

Remaining: maintained identity/MFA and roles, distributed edge abuse limits, collection/normalization, event redaction, complete privacy lifecycle, physical disk alarms, individually attributable/external audit, offsite scheduled recovery, sustained-volume benchmark and independent security/privacy assessment. Use synthetic data until rollout gates are approved.

## Evidence and operator procedures

- `docs/OPERATIONS.md`: actual limits, CLI usage, holds and limits.
- `docs/BACKUP-AND-RESTORE.md`: trust boundary and recovery procedure.
- `docs/audit/BATCH-003-REVIEW.md`: local test evidence and reviewed defects.
- `docs/tickets/BUILD-BATCH-003.md`: acceptance traceability.
- PostgreSQL16 [advisory locks](https://www.postgresql.org/docs/16/explicit-locking.html#ADVISORY-LOCKS), [pg_dump](https://www.postgresql.org/docs/16/app-pgdump.html), [pg_restore](https://www.postgresql.org/docs/16/app-pgrestore.html); [Node cryptography](https://nodejs.org/api/crypto.html). Primary documentation reviewed 2026-10-24; source trust and key ownership remain required.
