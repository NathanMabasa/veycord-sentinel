# Local PostgreSQL backup and restore

This is an operator-run full database backup for the local PostgreSQL prototype. It captures the entire configured database, including every workspace and all event, finding, case, quota, and audit data. It is a database administrator operation, not a workspace or tenant export. The public demo is not part of this backup path.

The commands are disabled unless the operator supplies an explicit confirmation flag. Both source and destination must resolve to a loopback PostgreSQL host (`localhost`, `127.0.0.1`, or `::1`) in this first version. Remote libpq trust and certificate settings are outside this tool’s reviewed scope. Local plaintext requires the corresponding explicit `*_ALLOW_LOCAL_INSECURE=true` setting.

## Key and backup handling

Generate a random 32-byte base64url key with a trusted local secret manager or password manager. Supply it as `SENTINEL_BACKUP_KEY` through the operator’s protected environment. Do not place the key in the backup file, repository, command arguments, logs, screenshots, or the same storage location as the backup. Back up and recover the key separately; without it, the encrypted archive cannot be restored.

The envelope uses AES-256-GCM with a fresh random 12-byte nonce. Its versioned header and metadata are authenticated as additional data. The complete encrypted archive is limited to 256 MiB, and the plaintext dump is bounded while `pg_dump` streams it into a mode-0600 file in a private temporary directory. The encrypted output is staged beside its destination, synced, and atomically published with a no-overwrite filesystem operation. The destination directory must already exist and support same-filesystem hard links. Existing files are preserved.

The encrypted envelope detects modification and wrong keys. It does **not** establish who created the archive or make its SQL trustworthy. `pg_restore` may execute SQL statements from a database archive. Restore only archives from a source you trust and protect the backup key from anyone who can create or replace backups.

## Create a backup

Install PostgreSQL client tools (`pg_dump`, `pg_restore`, and `psql`) compatible with the database server. Set `DATABASE_ADMIN_URL` to the local source database administrator connection and set `DATABASE_ADMIN_ALLOW_LOCAL_INSECURE=true` for a loopback plaintext connection. If using the repository’s npm scripts, provide settings through the operator’s protected environment; do not put credentials in shell command arguments.

```sh
node --import tsx db/backup.ts --confirm-database-backup ./private-backups/veycord-2026-10-24.vybak
```

The command creates a custom-format `pg_dump` of that whole database using `--no-owner --no-acl`, encrypts it, and publishes the new file with mode `0600`. It fails if the output already exists. It never prints the database password or backup key. Keep the database administrator credential and encryption key separate from the backup destination.

## Restore to an empty database

Create a new, empty database on a local PostgreSQL target. Prepare the restricted global `sentinel_app` role on that PostgreSQL cluster using the existing runtime-role bootstrap with `DATABASE_ADMIN_URL` pointed at the target administrator URL. The role must remain `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOBYPASSRLS`, `NOINHERIT`, and have no role memberships. The restore tool refuses to proceed when that role is absent or has unsafe privileges.

Set `RESTORE_DATABASE_ADMIN_URL` to a separate local administrator URL naming the empty destination database. For loopback plaintext, set `RESTORE_DATABASE_ADMIN_ALLOW_LOCAL_INSECURE=true`. Supply the separately recovered `SENTINEL_BACKUP_KEY` through the protected environment.

```sh
node --import tsx db/restore.ts --confirm-empty-target ./private-backups/veycord-2026-10-24.vybak
```

Restore authenticates and decrypts the complete archive into a private temporary file before calling `pg_restore`. Before changing the target, it checks that the archive contains Sentinel migration history and only recognizes migration versions supported by this checkout. It refuses unrelated databases, archives without the `001_initial_schema.sql` baseline, and archives marked with a newer or unknown migration. It then checks for user schemas, relations, routines, extensions, or large objects in the target, and refuses any non-empty target. It uses `pg_restore --single-transaction --exit-on-error --no-owner --no-acl`; it never drops or cleans existing objects. The temporary plaintext archive is removed on success or failure.

After extracting a supported archive, restore runs every current numbered migration missing from its `schema_migrations` history, under the same advisory lock and per-migration transaction used by the migration CLI. This upgrades trusted older Sentinel archives, including schema 001 archives, before runtime grants are checked and reapplied. If restore, migration, or final validation fails after extraction has begun, treat the target database as quarantined: do not point the application at it or resume service. Preserve it for investigation or discard and recreate an empty target before retrying. Restore does not automatically roll back an archive after a later migration or runtime check fails.

After the restore, the tool verifies the restricted role and expected forced-RLS tables, then reapplies only the reviewed `sentinel_app` grants for `workspaces`, `events`, `findings`, `cases`, and `audit_entries`. It rejects a role that owns application objects. Global roles, passwords, application tokens, and deployment configuration are not part of a `pg_dump` database archive; restore those separately. The runtime role password remains the value configured for the target cluster.

## Verify application recovery

An authenticated restore message confirms the archive was applied and the reviewed grants were issued. It does not by itself prove that the service is ready. Point the application’s `DATABASE_URL` at the restored database and verify, using its configured workspace and service credential:

1. `GET /api/private/v1/health` succeeds through the `sentinel_app` connection.
2. `GET /api/private/v1/summary` matches expected event, finding, and open-case counts and the latest event timestamp.
3. Representative events, findings, and cases can be read. Compare known IDs and notes from the recovery record.
4. `GET /api/private/v1/audit` returns expected workspace-scoped entries; a second workspace remains invisible to the first workspace context.
5. The restored service can perform a reviewed case update and append a new audit entry.

An archive restore uses `--no-owner --no-acl`, so PostgreSQL object owners and ACLs from the source are intentionally not restored. The restore command reapplies only this prototype’s restricted runtime grants. Review other custom roles, grants, extensions, database settings, and external configuration separately before resuming service. Do not claim recovery complete until runtime access and the expected data integrity checks have passed.

## Limits

- The backup covers one configured PostgreSQL database, not the whole server or global roles.
- Backup and restore are manual local operations. Scheduling, offsite storage, retention, rotation, restore-time guarantees, and external monitoring are not implemented.
- The 256 MiB archive cap is intentional for this local prototype; larger archives are rejected.
- Only custom-format PostgreSQL archives from a trusted source are accepted.
- The integration test uses a disposable local PostgreSQL cluster and synthetic records. It verifies cryptographic tamper/wrong-key rejection, no-overwrite behavior, the empty-target guard, restore grants, runtime `PostgresStore` access across event, finding, case, and audit reads, and migration of a schema 001 archive to the current schema before runtime access. It does not establish a production recovery objective or independent security review.


## Input file handling update (2026-10-25)

Encryption/decryption now open source files once with `O_NOFOLLOW`, validate that descriptor and read through it. Encryption streams at most the validated size and rejects size mismatch. Symlink inputs are refused. This POSIX file-handling path is verified on macOS and Linux; no Windows-native recovery claim is established. Keep working directories private to the operator; these controls do not protect against an administrator who can modify the process or its open files.
