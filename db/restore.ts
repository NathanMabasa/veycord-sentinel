import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { decryptArchiveFile, parseBackupKey, parseLoopbackAdminUrl } from './backup-format.js';
import { createAdminPool } from './admin-connection.js';
import { applyMigrations, listMigrationFiles } from './migration-runner.js';

const execFile = promisify(execFileCallback);

const EMPTY_DATABASE_SQL = `
SELECT CASE WHEN
  NOT EXISTS (
    SELECT 1 FROM pg_namespace
    WHERE nspname NOT IN ('pg_catalog','pg_toast','information_schema','public') AND nspname !~ '^pg_(toast_)?temp_[0-9]+$'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f', 'i', 'I')
  )
  AND NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public')
  AND NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype IN ('e', 'd', 'c', 'r', 'm') AND t.typrelid = 0
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname <> 'plpgsql'
  )
  AND NOT EXISTS (SELECT 1 FROM pg_collation c JOIN pg_namespace n ON n.oid=c.collnamespace WHERE n.nspname='public')
  AND NOT EXISTS (SELECT 1 FROM pg_operator o JOIN pg_namespace n ON n.oid=o.oprnamespace WHERE n.nspname='public')
  AND NOT EXISTS (SELECT 1 FROM pg_opclass o JOIN pg_namespace n ON n.oid=o.opcnamespace WHERE n.nspname='public')
  AND NOT EXISTS (SELECT 1 FROM pg_opfamily o JOIN pg_namespace n ON n.oid=o.opfnamespace WHERE n.nspname='public')
  AND NOT EXISTS (SELECT 1 FROM pg_ts_config t JOIN pg_namespace n ON n.oid=t.cfgnamespace WHERE n.nspname='public')
  AND NOT EXISTS (SELECT 1 FROM pg_ts_dict t JOIN pg_namespace n ON n.oid=t.dictnamespace WHERE n.nspname='public')
  AND NOT EXISTS (SELECT 1 FROM pg_ts_parser t JOIN pg_namespace n ON n.oid=t.prsnamespace WHERE n.nspname='public')
  AND NOT EXISTS (SELECT 1 FROM pg_ts_template t JOIN pg_namespace n ON n.oid=t.tmplnamespace WHERE n.nspname='public')
  AND NOT EXISTS (SELECT 1 FROM pg_foreign_server)
  AND NOT EXISTS (SELECT 1 FROM pg_largeobject_metadata)
THEN 'empty' ELSE 'not-empty' END;
`;

const REAPPLY_RUNTIME_GRANTS_SQL = `
DO $$
DECLARE
  runtime_oid oid;
BEGIN
  SELECT oid INTO runtime_oid FROM pg_roles WHERE rolname = 'sentinel_app';
  IF runtime_oid IS NULL THEN
    RAISE EXCEPTION 'restricted runtime role is missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_roles
    WHERE oid = runtime_oid
      AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolinherit OR rolreplication)
  ) OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = runtime_oid) THEN
    RAISE EXCEPTION 'restricted runtime role has unsafe attributes or memberships';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND c.relowner = runtime_oid
  ) OR EXISTS (
    SELECT 1 FROM pg_namespace n
    WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema' AND n.nspowner = runtime_oid
  ) THEN
    RAISE EXCEPTION 'restricted runtime role owns application objects';
  END IF;
  IF EXISTS (
    SELECT expected.name
    FROM (VALUES ('workspaces'), ('events'), ('findings'), ('cases'), ('audit_entries')) AS expected(name)
    LEFT JOIN pg_class c ON c.relnamespace = 'public'::regnamespace AND c.relname = expected.name AND c.relkind IN ('r', 'p')
    WHERE c.oid IS NULL OR NOT c.relrowsecurity OR NOT c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'restored schema is missing expected forced row security';
  END IF;
  EXECUTE 'GRANT CONNECT ON DATABASE ' || quote_ident(current_database()) || ' TO sentinel_app';
  EXECUTE 'REVOKE CREATE ON SCHEMA public FROM PUBLIC';
  EXECUTE 'REVOKE CREATE ON SCHEMA public FROM sentinel_app';
  EXECUTE 'GRANT USAGE ON SCHEMA public TO sentinel_app';
  EXECUTE 'GRANT SELECT ON workspaces TO sentinel_app';
  EXECUTE 'GRANT SELECT, INSERT ON events, findings, audit_entries TO sentinel_app';
  EXECUTE 'GRANT SELECT, INSERT, UPDATE ON cases TO sentinel_app';
END
$$;
`;

async function runTool(command: string, args: string[], env: NodeJS.ProcessEnv, maxBuffer = 1024 * 1024): Promise<string> {
  try {
    const { stdout } = await execFile(command, args, {
      env,
      encoding: 'utf8',
      windowsHide: true,
      timeout: 10 * 60 * 1000,
      maxBuffer,
    });
    return stdout;
  } catch {
    throw new Error('PostgreSQL restore validation failed; check local database access, PostgreSQL tools, and the target database');
  }
}

async function assertRuntimeRoleIsReady(env: NodeJS.ProcessEnv): Promise<void> {
  const sql = `SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_roles r
    WHERE r.rolname = 'sentinel_app' AND r.rolcanlogin AND NOT r.rolsuper AND NOT r.rolcreatedb
      AND NOT r.rolcreaterole AND NOT r.rolbypassrls AND NOT r.rolinherit AND NOT r.rolreplication
      AND NOT EXISTS (SELECT 1 FROM pg_auth_members m WHERE m.member = r.oid)
  ) THEN 'ready' ELSE 'not-ready' END;`;
  const result = await runTool('psql', [
    '--no-password', '--quiet', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', sql,
  ], env, 16 * 1024);
  if (result.trim() !== 'ready') {
    throw new Error('The target cluster must have the restricted sentinel_app runtime role prepared before restore');
  }
}

async function assertDatabaseIsEmpty(env: NodeJS.ProcessEnv): Promise<void> {
  const result = await runTool('psql', [
    '--no-password', '--quiet', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', EMPTY_DATABASE_SQL,
  ], env, 16 * 1024);
  if (result.trim() !== 'empty') {
    throw new Error('Restore refused: target database contains user schemas or data');
  }
}

async function assertSupportedArchiveMigrations(archivePath: string, env: NodeJS.ProcessEnv): Promise<void> {
  const files = await listMigrationFiles();
  if (files.length === 0 || files[0] !== '001_initial_schema.sql') {
    throw new Error('Backup archive cannot be checked against the supported Sentinel migration baseline');
  }
  const toc = await runTool('pg_restore', ['--list', '--no-password', '--no-owner', '--no-acl', archivePath], env, 8 * 1024 * 1024);
  if (!/TABLE public schema_migrations\b/.test(toc) || !/TABLE DATA public schema_migrations\b/.test(toc)) {
    throw new Error('Backup archive is missing Sentinel migration history');
  }
  // pg_restore writes a SQL representation to stdout here; it parses but does not execute the archive's SQL.
  const historySql = await runTool('pg_restore', [
    '--no-password', '--no-owner', '--no-acl', '--data-only', '--table=schema_migrations', '--file=-', archivePath,
  ], env, 1024 * 1024);
  const copy = historySql.match(/COPY\s+public\.schema_migrations\s*\([^)]*\)\s+FROM\s+stdin;\r?\n([\s\S]*?)\r?\n\\\.\r?\n/i);
  if (!copy) throw new Error('Backup archive does not contain readable Sentinel migration history');
  const versions = new Set(copy[1].split(/\r?\n/).filter(Boolean).map((row) => row.split('\t', 1)[0]));
  const supported = new Set(files);
  if (!versions.has(files[0]) || [...versions].some((version) => !supported.has(version))) {
    throw new Error('Backup archive has an unsupported or newer Sentinel migration version');
  }
}

/** Authenticate a full archive before inspecting PostgreSQL or applying any restore command. */
export async function restoreDatabaseBackup(options: {
  connectionString: string;
  allowLocalInsecure: boolean;
  backupKey: Buffer;
  backupPath: string;
}): Promise<void> {
  const backupPath = resolve(options.backupPath);
  const backupStat = await stat(backupPath);
  if (!backupStat.isFile()) throw new Error('Encrypted backup file is invalid');
  const env = parseLoopbackAdminUrl(options.connectionString, options.allowLocalInsecure);
  if (options.backupKey.length !== 32) throw new Error('Backup encryption key is invalid');
  const tempDirectory = await mkdtemp(resolve(tmpdir(), 'veycord-restore-'));
  const archivePath = resolve(tempDirectory, 'authenticated.dump');
  try {
    await decryptArchiveFile(backupPath, archivePath, options.backupKey);
    // This reads archive metadata only, after GCM has authenticated every byte.
    await assertSupportedArchiveMigrations(archivePath, env);
    await assertRuntimeRoleIsReady(env);
    await assertDatabaseIsEmpty(env);
    await runTool('pg_restore', [
      '--no-password', '--no-owner', '--no-acl', '--exit-on-error', '--single-transaction', `--dbname=${env.PGDATABASE}`, archivePath,
    ], env, 1024 * 1024);
    const pool = createAdminPool(options.connectionString, options.allowLocalInsecure);
    try {
      await applyMigrations({ pool, requireBaseline: true });
    } catch {
      throw new Error('Backup schema migration failed after restore; quarantine the target database and do not resume service');
    } finally {
      await pool.end();
    }
    await runTool('psql', [
      '--no-password', '--quiet', '--set=ON_ERROR_STOP=1', '--command', REAPPLY_RUNTIME_GRANTS_SQL,
    ], env, 32 * 1024);
  } catch (error) {
    if (error instanceof Error && /^(Backup|Encrypted|Restore refused|The target cluster|PostgreSQL)/.test(error.message)) throw error;
    throw new Error('Could not restore the authenticated archive to the empty target database');
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

export async function runRestoreCli(args = process.argv.slice(2), env = process.env): Promise<void> {
  if (args.length !== 2 || args[0] !== '--confirm-empty-target') {
    throw new Error('Usage: restore.ts --confirm-empty-target <encrypted-backup-file>');
  }
  const backupPath = args[1];
  if (!backupPath || backupPath.startsWith('-')) throw new Error('An encrypted backup path is required');
  const connectionString = env.RESTORE_DATABASE_ADMIN_URL;
  if (!connectionString || connectionString.length > 4096) throw new Error('RESTORE_DATABASE_ADMIN_URL is missing or invalid');
  const key = parseBackupKey(env.SENTINEL_BACKUP_KEY);
  const allowLocalInsecure = env.RESTORE_DATABASE_ADMIN_ALLOW_LOCAL_INSECURE === 'true';
  if (env.RESTORE_DATABASE_ADMIN_ALLOW_LOCAL_INSECURE && env.RESTORE_DATABASE_ADMIN_ALLOW_LOCAL_INSECURE !== 'true' && env.RESTORE_DATABASE_ADMIN_ALLOW_LOCAL_INSECURE !== 'false') {
    throw new Error('RESTORE_DATABASE_ADMIN_ALLOW_LOCAL_INSECURE must be true or false');
  }
  await restoreDatabaseBackup({ connectionString, allowLocalInsecure, backupKey: key, backupPath });
  process.stdout.write('Authenticated database archive restored; restricted runtime grants were re-applied. Verify application access and expected records before treating recovery as complete.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runRestoreCli().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Database restore failed'}\n`);
    process.exitCode = 1;
  });
}
