# Private workspace operations

2026-10-24. This is a single-operator alpha. Apply migrations before starting the current runtime. Keep the public synthetic demo separate from private data, and do not expose a real-telemetry service before the remaining identity/privacy/operational gates are reviewed.

## Capacity

Default limits per workspace: 100,000 events, 100 MiB of canonical accepted-event JSON bytes, 1,000 cases including closed cases, and 200,000 audit entries. Event bytes are logical input accounting, not PostgreSQL disk usage; findings, indexes, audit, WAL and backups add storage overhead. Monitor actual disk space independently.

Limits are stored on the server in `workspaces`. Requests cannot supply overrides. Ingestion, case mutations and retention serialize writes for a workspace using a PostgreSQL transaction advisory lock, so independent application instances cannot race past quota. Duplicate event IDs within a source/workspace do not consume another event slot. A failed quota or audit write rolls the whole mutation back. The API returns safe `409 QUOTA_EXCEEDED`; reads remain available. Process-local read/write rate limits are separate and do not replace edge abuse controls.

Use the administrator-only CLI from the source checkout:

```sh
npm run db:limits
npm run db:limits -- --max-events 150000 --max-event-bytes 209715200
npm run db:limits -- --max-events 150000 --max-event-bytes 209715200 --apply
```

No arguments shows current settings. Overrides without `--apply` are a dry run. Other supported options are `--max-cases`, `--max-audit-entries` and `--retention-days`. Values are bounded integers; reductions below current usage are refused. An applied change appends a maintenance audit entry; enough audit capacity must exist for that entry. Reducing retention changes eligibility; it never deletes records by itself. Review physical capacity before increasing limits. Do not use ad hoc client-supplied SQL or workspace IDs for administration.

## Retention

```sh
npm run db:retention
npm run db:retention -- --apply
```

Dry run is the default. The trusted `SENTINEL_WORKSPACE_ID` comes from private administrator configuration. Eligibility uses server `received_at`, with a default 30-day period, so a future or old event timestamp cannot evade or accelerate reception-based retention. Each apply deletes at most 5,000 eligible events and cascades their unreferenced findings. Any event linked through a finding to an open **or closed** case is held. Case creation and retention share the workspace lock; referential constraints are additional protection. Apply records cutoff/counts in the audit trail and fails without deletion if audit capacity is exhausted.

No background cleanup schedule exists. Inspect eligible/held counts in Operations, run a dry run, and approve an explicit apply. Case-linked evidence, case deletion, audit archival and backup-retention policy require separate decisions; they are not silently erased. Audit growth is capped, not automatically pruned. Backups may retain deleted records until their own reviewed retention policy expires.

## Audit

`GET /api/private/v1/audit` returns at most 100 recent scoped entries. Successful ingestion, case changes, limit changes and retention applies are recorded transactionally. Entries contain counts, IDs, statuses and change flags; raw events, analyst notes and service keys are not audit details. The runtime role can SELECT/INSERT audit rows and cannot UPDATE/DELETE them. The actor is `operator-service` or `maintenance`, not an individual user identity.

This is append-only protection against runtime edits, not externally anchored tamper proof storage. A database administrator can alter records, and a compromised runtime credential can insert misleading entries. Individual attribution, denied-auth/read/export auditing, external anchoring and an independent log pipeline remain release gates.

## Recovery and runtime credentials

Follow [backup and restore](BACKUP-AND-RESTORE.md). Only restore trusted-source archives into an empty isolated target. Verify restricted runtime access and expected records before switching services. Manual encrypted backups are available; offsite copies, scheduling, key escrow/rotation and recovery-time commitments remain operator work.

`npm run config:runtime` writes `.env.runtime` with an explicit allowlist of runtime settings and mode0600, refusing to overwrite an existing file. `npm start` runs compiled JavaScript and reads this file. A dedicated runtime refuses administrative/restore/encryption credentials in its environment. Keep those in separate maintenance processes; the Vite development server is not a production boundary. After a rotation, update the private runtime file and restart deliberately. Never commit either configuration file or a database/key/archive.
