import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { lstat, mkdtemp, open, readFile, rm, symlink, truncate, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import { test } from 'node:test';
import { Pool } from 'pg';
import { createDatabaseBackup, runBackupCli } from '../db/backup.js';
import { decryptArchiveFile, encryptArchiveFile, parseBackupKey, parseLoopbackAdminUrl } from '../db/backup-format.js';
import { restoreDatabaseBackup, runRestoreCli } from '../db/restore.js';
import { PostgresStore } from '../server/storage/postgres-store.js';

const execFile = promisify(execFileCallback);
const READ_NOFOLLOW = constants.O_RDONLY | constants.O_NOFOLLOW;

async function readAt(file: Awaited<ReturnType<typeof open>>, size: number): Promise<Buffer> {
  const contents = Buffer.alloc(size);
  let offset = 0;
  while (offset < size) {
    const result = await file.read(contents, offset, size - offset, offset);
    if (result.bytesRead === 0) throw new Error('Test artifact changed while being read');
    offset += result.bytesRead;
  }
  return contents;
}

function runningInCi(): boolean {
  return /^(1|true)$/i.test(process.env.CI ?? '') || process.env.GITHUB_ACTIONS === 'true';
}

async function startPostgres(dataDir: string, logFile: string, port: number): Promise<void> {
  try {
    await execFile('pg_ctl', [
      '-D', dataDir, '-l', logFile,
      '-o', `-h 127.0.0.1 -p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories=''`,
      '-w', 'start',
    ]);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    let serverLog = '(PostgreSQL log unavailable)';
    try {
      serverLog = (await readFile(logFile, 'utf8')).slice(-12_000);
    } catch {
      // Preserve the startup failure if the log could not be read.
    }
    throw new Error(`Disposable PostgreSQL startup failed (${code ?? 'unknown error'}). Last server log output, capped at 12000 characters:\n${serverLog}`);
  }
}

function localUrl(user: string, password: string, port: number, database: string): string {
  const url = new URL(`postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@127.0.0.1:${port}/${database}`);
  url.searchParams.set('sslmode', 'disable');
  return url.toString();
}

async function freePort(): Promise<number> {
  const { createServer } = await import('node:net');
  const server = createServer();
  await new Promise<void>((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Could not allocate a local PostgreSQL test port');
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

test('backup key, local admin connection, and AES-GCM envelope reject unsafe or altered inputs', async () => {
  await assert.rejects(runBackupCli(['./existing.vybak'], {}), /confirm-database-backup/);
  await assert.rejects(runRestoreCli(['./archive.vybak'], {}), /confirm-empty-target/);
  const keyText = randomBytes(32).toString('base64url');
  const key = parseBackupKey(keyText);
  assert.equal(key.length, 32);
  assert.throws(() => parseBackupKey('short'), /32-byte/);
  assert.throws(() => parseLoopbackAdminUrl('postgresql://a:b@db.example.test/db?sslmode=disable', true), /loopback/);
  assert.throws(() => parseLoopbackAdminUrl('postgresql://a:b@localhost/db?sslmode=disable', false), /explicit/);
  assert.equal(parseLoopbackAdminUrl('postgresql://a:b@127.0.0.1/db?sslmode=disable', true).PGPASSWORD, 'b');
  assert.throws(()=>parseLoopbackAdminUrl('postgresql://a:b@localhost/host%3Devil.example%20dbname%3Ddb',true),/unsupported characters/);

  const directory = await mkdtemp(join(tmpdir(), 'veycord-backup-format-test-'));
  const archive = join(directory, 'plain.dump');
  const encrypted = join(directory, 'archive.vybak');
  const decrypted = join(directory, 'decrypted.dump');
  const tampered = join(directory, 'tampered.vybak');
  const archiveLink = join(directory, 'archive-link.dump');
  const envelopeLink = join(directory, 'envelope-link.vybak');
  await writeFile(archive, randomBytes(128), { mode: 0o600 });
  try {
    await symlink(archive, archiveLink);
    await assert.rejects(encryptArchiveFile(archiveLink, join(directory, 'symlink-encrypted.vybak'), key), /Could not read the database archive/);
    await encryptArchiveFile(archive, encrypted, key, '2026-10-24T00:00:00.000Z');
    const metadata = await decryptArchiveFile(encrypted, decrypted, key);
    assert.equal(metadata.format, 'veycord-postgres-backup');
    assert.deepEqual(await readFile(decrypted), await readFile(archive));
    const encryptedHandle = await open(encrypted, READ_NOFOLLOW);
    try {
      const encryptedStat = await encryptedHandle.stat();
      assert.equal(encryptedStat.mode & 0o777, 0o600);
      const bytes = await readAt(encryptedHandle, encryptedStat.size);
      await assert.rejects(decryptArchiveFile(encrypted, join(directory, 'wrong-key.dump'), randomBytes(32)), /authentication failed/);
      await assert.rejects(open(join(directory, 'wrong-key.dump'), READ_NOFOLLOW), { code: 'ENOENT' });
      bytes[bytes.length - 17] ^= 1;
      await writeFile(tampered, bytes, { mode: 0o600 });
      await assert.rejects(decryptArchiveFile(tampered, join(directory, 'tampered.dump'), key), /authentication failed/);
      await assert.rejects(open(join(directory, 'tampered.dump'), READ_NOFOLLOW), { code: 'ENOENT' });
    } finally {
      await encryptedHandle.close();
    }
    await symlink(encrypted, envelopeLink);
    await assert.rejects(decryptArchiveFile(envelopeLink, join(directory, 'symlink-decrypted.dump'), key), /Could not read the encrypted backup/);
    const occupiedEnvelope = join(directory, 'occupied.vybak');
    await writeFile(occupiedEnvelope, 'pre-existing encrypted backup', { mode: 0o600 });
    await assert.rejects(encryptArchiveFile(archive, occupiedEnvelope, key), /Could not encrypt/);
    assert.equal(await readFile(occupiedEnvelope, 'utf8'), 'pre-existing encrypted backup');
    const occupiedPlaintext = join(directory, 'occupied.dump');
    await writeFile(occupiedPlaintext, 'pre-existing operator file', { mode: 0o600 });
    await assert.rejects(decryptArchiveFile(encrypted, occupiedPlaintext, key), /Could not read/);
    assert.equal(await readFile(occupiedPlaintext, 'utf8'), 'pre-existing operator file');
    const oversizedArchive = join(directory, 'oversized.dump');
    await writeFile(oversizedArchive, Buffer.from([1]), { mode: 0o600 });
    await truncate(oversizedArchive, 256 * 1024 * 1024 + 1);
    await assert.rejects(encryptArchiveFile(oversizedArchive, join(directory, 'oversized.vybak'), key), /supported backup size/);
    assert.throws(() => parseBackupKey(Buffer.alloc(32, 1).toString('base64')) , /32-byte/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('PostgreSQL backup restores a synthetic Sentinel workspace and restricted runtime access', async (context) => {
  const binaryChecks = await Promise.all(['initdb', 'pg_ctl', 'pg_dump', 'pg_restore', 'psql'].map((name) => execFile(name, ['--version']).then(() => true).catch(() => false)));
  if (binaryChecks.some((present) => !present)) {
    const message = 'PostgreSQL test binaries are unavailable; backup recovery was not exercised';
    if (runningInCi()) throw new Error(message);
    context.skip(`${message} locally`);
    return;
  }

  const temp = await mkdtemp(join(tmpdir(), 'veycord-backup-integration-'));
  const dataDir = join(temp, 'data');
  const passwordFile = join(temp, 'initdb-password');
  const logFile = join(temp, 'postgres.log');
  const outputPath = join(temp, 'synthetic.vybak');
  const legacyOutputPath = join(temp, 'legacy-001.vybak');
  const tamperedPath = join(temp, 'tampered.vybak');
  const adminPassword = randomBytes(36).toString('base64url');
  const runtimePassword = randomBytes(36).toString('base64url');
  const backupKeyText = randomBytes(32).toString('base64url');
  const backupKey = parseBackupKey(backupKeyText);
  const port = await freePort();
  let started = false;
  let admin: Pool | undefined;
  let sourceAdmin: Pool | undefined;
  let legacyAdmin: Pool | undefined;
  let sourceStore: PostgresStore | undefined;
  let restoredStore: PostgresStore | undefined;
  let otherRestoredStore: PostgresStore | undefined;
  let legacyRestoredStore: PostgresStore | undefined;

  try {
    await writeFile(passwordFile, `${adminPassword}\n`, { mode: 0o600 });
    await execFile('initdb', [
      '--username=postgres', '--auth-host=scram-sha-256', '--auth-local=scram-sha-256',
      `--pwfile=${passwordFile}`, dataDir,
    ]);
    await startPostgres(dataDir, logFile, port);
    started = true;

    const adminUrl = localUrl('postgres', adminPassword, port, 'postgres');
    admin = new Pool({ connectionString: adminUrl, ssl: false, max: 2, connectionTimeoutMillis: 3000 });
    const roleSql = await admin.query<{ sql: string }>(
      "SELECT format('CREATE ROLE sentinel_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L', $1::text) AS sql",
      [runtimePassword],
    );
    await admin.query(roleSql.rows[0].sql);
    await admin.query('CREATE DATABASE source_db');
    await admin.query('CREATE DATABASE target_db');
    await admin.query('CREATE DATABASE blocked_db');
    await admin.query('CREATE DATABASE legacy_db');
    await admin.query('CREATE DATABASE legacy_target_db');

    const legacyUrl = localUrl('postgres', adminPassword, port, 'legacy_db');
    legacyAdmin = new Pool({ connectionString: legacyUrl, ssl: false, max: 1 });
    const legacyMigration = await readFile(join(process.cwd(), 'db/migrations/001_initial_schema.sql'), 'utf8');
    await legacyAdmin.query(legacyMigration);
    await legacyAdmin.query(`CREATE TABLE schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    await legacyAdmin.query('INSERT INTO schema_migrations (version) VALUES ($1)', ['001_initial_schema.sql']);
    const legacyWorkspaceId = randomUUID();
    const legacyEventId = randomUUID();
    const legacyFindingId = randomUUID();
    await legacyAdmin.query('INSERT INTO workspaces (id, name) VALUES ($1, $2)', [legacyWorkspaceId, 'Schema 001 recovery fixture']);
    await legacyAdmin.query(`INSERT INTO events (id, workspace_id, event_id, timestamp, event, source, host, severity, attributes, raw)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, [
      legacyEventId, legacyWorkspaceId, 'legacy-001-event', '2026-10-23T08:00:00Z', 'Synthetic legacy event',
      'legacy-test', 'legacy.example.test', 'medium', { synthetic: true }, '{"legacy":true}',
    ]);
    await legacyAdmin.query(`INSERT INTO findings (id, workspace_id, event_uuid, rule_id, name, severity, technique_id, reason, evidence)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
      legacyFindingId, legacyWorkspaceId, legacyEventId, 'LEGACY-TEST-001', 'Legacy recovery finding',
      'medium', 'T1059', 'Synthetic schema 001 fixture.', JSON.stringify(['legacy fixture']),
    ]);
    await legacyAdmin.query(`INSERT INTO cases (id, workspace_id, title, note, finding_id)
      VALUES ($1, $2, $3, $4, $5)`, [randomUUID(), legacyWorkspaceId, 'Legacy recovery case', 'Created before migration 002', legacyFindingId]);

    await createDatabaseBackup({
      connectionString: legacyUrl, allowLocalInsecure: true, backupKey, outputPath: legacyOutputPath,
    });

    const sourceUrl = localUrl('postgres', adminPassword, port, 'source_db');
    const migrationEnv = {
      PATH: process.env.PATH,
      DATABASE_ADMIN_URL: sourceUrl,
      DATABASE_ADMIN_ALLOW_LOCAL_INSECURE: 'true',
    };
    await execFile(process.execPath, ['--import', 'tsx', 'db/migrate.ts'], { cwd: process.cwd(), env: migrationEnv });
    sourceAdmin = new Pool({ connectionString: sourceUrl, ssl: false, max: 1 });
    const workspaceId = randomUUID();
    const otherWorkspaceId = randomUUID();
    await sourceAdmin.query(
      'INSERT INTO workspaces (id, name) VALUES ($1, $2), ($3, $4)',
      [workspaceId, 'Synthetic recovery workspace', otherWorkspaceId, 'Separate synthetic workspace'],
    );
    const sourceRuntimeUrl = localUrl('sentinel_app', runtimePassword, port, 'source_db');
    sourceStore = new PostgresStore({ connectionString: sourceRuntimeUrl, workspaceId, allowLocalInsecure: true });
    await sourceStore.ping();
    const event = {
      eventId: 'backup-recovery-event', timestamp: '2026-10-24T08:00:00.000Z', event: 'Synthetic service created',
      source: 'synthetic-test', host: 'fixture.example.test', severity: 'high' as const,
      attributes: { synthetic: true }, raw: '{"synthetic":true}',
    };
    const match = {
      ruleId: 'BACKUP-TEST-001', ruleVersion: '1.2.3', name: 'Synthetic recovery finding', severity: 'high' as const,
      techniqueId: 'T1543.003', reason: 'A synthetic event was used to verify database recovery.', evidence: ['fixture only'],
    };
    assert.deepEqual(await sourceStore.ingest([event], [[match]]), { accepted: 1, duplicates: 0, findings: 1 });
    const sourceFindings = await sourceStore.listFindings(10);
    const sourceCase = await sourceStore.createCase({ title: 'Synthetic recovery case', note: 'Restore fixture', findingId: sourceFindings[0].id });
    assert.equal(sourceCase.status, 'open');
    assert.equal((await sourceStore.listAudit(20)).some((item) => item.action === 'case.created'), true);
    await sourceStore.close();
    sourceStore = undefined;

    const targetUrl = localUrl('postgres', adminPassword, port, 'target_db');
    await createDatabaseBackup({
      connectionString: sourceUrl, allowLocalInsecure: true, backupKey, outputPath,
    });
    const outputHandle = await open(outputPath, READ_NOFOLLOW);
    let archiveBefore: Buffer;
    try {
      archiveBefore = await outputHandle.readFile();
      await assert.rejects(createDatabaseBackup({
        connectionString: sourceUrl, allowLocalInsecure: true, backupKey, outputPath,
      }), /already exists/);
      // Assert path identity after refusal without using a check to decide a new path open.
      const outputStat = await outputHandle.stat();
      const pathStat = await lstat(outputPath);
      assert.ok(pathStat.isFile());
      assert.equal(outputStat.mode & 0o777, 0o600);
      assert.equal(pathStat.dev, outputStat.dev);
      assert.equal(pathStat.ino, outputStat.ino);
      assert.deepEqual(await readAt(outputHandle, outputStat.size), archiveBefore);
    } finally {
      await outputHandle.close();
    }

    await writeFile(tamperedPath, archiveBefore);
    const damaged = await readFile(tamperedPath);
    damaged[Math.floor(damaged.length / 2)] ^= 1;
    await writeFile(tamperedPath, damaged, { mode: 0o600 });
    await assert.rejects(restoreDatabaseBackup({
      connectionString: targetUrl, allowLocalInsecure: true, backupKey: randomBytes(32), backupPath: outputPath,
    }), /authentication failed/);
    await assert.rejects(restoreDatabaseBackup({
      connectionString: targetUrl, allowLocalInsecure: true, backupKey, backupPath: tamperedPath,
    }), /authentication failed/);

    const blockedUrl = localUrl('postgres', adminPassword, port, 'blocked_db');
    const blockedAdmin = new Pool({ connectionString: blockedUrl, ssl: false, max: 1 });
    try { await blockedAdmin.query('CREATE TABLE existing_data (id integer)'); }
    finally { await blockedAdmin.end(); }
    await assert.rejects(restoreDatabaseBackup({
      connectionString: blockedUrl, allowLocalInsecure: true, backupKey, backupPath: outputPath,
    }), /contains user schemas or data/);

    await restoreDatabaseBackup({
      connectionString: targetUrl, allowLocalInsecure: true, backupKey, backupPath: outputPath,
    });
    const targetRuntimeUrl = localUrl('sentinel_app', runtimePassword, port, 'target_db');
    restoredStore = new PostgresStore({ connectionString: targetRuntimeUrl, workspaceId, allowLocalInsecure: true });
    await restoredStore.ping();
    assert.deepEqual(await restoredStore.summary(), {
      eventCount: 1, findingCount: 1, openCaseCount: 1, latestEventAt: '2026-10-24T08:00:00.000Z',
    });
    assert.equal((await restoredStore.listEvents({ from: '2026-10-24T00:00:00Z', to: '2026-10-25T00:00:00Z', limit: 10 })).data.length, 1);
    assert.equal((await restoredStore.listFindings(10)).length, 1);
    assert.equal((await restoredStore.listFindings(10))[0].ruleVersion, '1.2.3');
    assert.equal((await restoredStore.listCases(10))[0].note, 'Restore fixture');
    assert.equal((await restoredStore.listAudit(20)).some((item) => item.action === 'case.created'), true);
    otherRestoredStore = new PostgresStore({ connectionString: targetRuntimeUrl, workspaceId: otherWorkspaceId, allowLocalInsecure: true });
    assert.deepEqual(await otherRestoredStore.summary(), {
      eventCount: 0, findingCount: 0, openCaseCount: 0, latestEventAt: null,
    });
    assert.equal((await otherRestoredStore.listAudit(20)).length, 0);

    const legacyTargetUrl = localUrl('postgres', adminPassword, port, 'legacy_target_db');
    await restoreDatabaseBackup({
      connectionString: legacyTargetUrl, allowLocalInsecure: true, backupKey, backupPath: legacyOutputPath,
    });
    const legacyRuntimeUrl = localUrl('sentinel_app', runtimePassword, port, 'legacy_target_db');
    legacyRestoredStore = new PostgresStore({ connectionString: legacyRuntimeUrl, workspaceId: legacyWorkspaceId, allowLocalInsecure: true });
    await legacyRestoredStore.ping();
    assert.deepEqual(await legacyRestoredStore.summary(), {
      eventCount: 1, findingCount: 1, openCaseCount: 1, latestEventAt: '2026-10-23T08:00:00.000Z',
    });
    assert.equal((await legacyRestoredStore.listEvents({ from: '2026-10-23T00:00:00Z', to: '2026-10-24T00:00:00Z', limit: 10 })).data[0].eventId, 'legacy-001-event');
    assert.equal((await legacyRestoredStore.listFindings(10))[0].name, 'Legacy recovery finding');
    assert.equal((await legacyRestoredStore.listFindings(10))[0].ruleVersion, null);
    assert.equal((await legacyRestoredStore.listCases(10))[0].note, 'Created before migration 002');
    assert.equal((await legacyRestoredStore.listAudit(20)).length, 0);
  } finally {
    await sourceStore?.close().catch(() => {});
    await restoredStore?.close().catch(() => {});
    await otherRestoredStore?.close().catch(() => {});
    await legacyRestoredStore?.close().catch(() => {});
    await admin?.end().catch(() => {});
    await sourceAdmin?.end().catch(() => {});
    await legacyAdmin?.end().catch(() => {});
    if (started) await execFile('pg_ctl', ['-D', dataDir, '-m', 'immediate', '-w', 'stop']).catch(() => {});
    await rm(temp, { recursive: true, force: true });
  }
});
