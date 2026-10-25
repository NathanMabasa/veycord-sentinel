import { spawn } from 'node:child_process';
import { constants, createWriteStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { chmod, link, mkdtemp, open, rm, stat, unlink } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { encryptArchiveFile, MAX_ARCHIVE_BYTES, parseBackupKey, parseLoopbackAdminUrl } from './backup-format.js';

const MAX_ENVELOPE_BYTES = MAX_ARCHIVE_BYTES + 4096 + 37;

function cliError(message: string): never {
  throw new Error(message);
}

async function syncFile(path: string): Promise<void> {
  const file = await open(path, constants.O_RDONLY);
  try { await file.sync(); } finally { await file.close(); }
}

async function dumpToBoundedPrivateFile(path: string, env: NodeJS.ProcessEnv): Promise<void> {
  const child = spawn('pg_dump', ['--no-password', '--format=custom', '--no-owner', '--no-acl'], {
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const output = createWriteStream(path, { flags: 'wx', mode: 0o600 });
  let outputCreated = false;
  let bytes = 0;
  let exceeded = false;
  output.once('open', () => { outputCreated = true; });
  const closed = new Promise<number | null>((resolveClose, rejectClose) => {
    child.once('close', (code) => resolveClose(code));
    child.once('error', rejectClose);
  });
  const timeout = setTimeout(() => { child.kill('SIGKILL'); }, 10 * 60 * 1000);
  timeout.unref();
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > MAX_ARCHIVE_BYTES) {
        exceeded = true;
        child.kill('SIGTERM');
        callback(new Error('archive size limit exceeded'));
      } else {
        callback(null, chunk);
      }
    },
  });
  try {
    await pipeline(child.stdout, limit, output);
    const exitCode = await closed;
    if (exitCode !== 0) throw new Error('pg_dump failed');
  } catch {
    child.kill('SIGTERM');
    await closed.catch(() => null);
    if (outputCreated) await unlink(path).catch(() => {});
    if (exceeded) throw new Error('Database archive exceeds the supported 256 MiB limit');
    throw new Error('Could not create a PostgreSQL backup; check local database access, PostgreSQL tools, and disk space');
  } finally {
    clearTimeout(timeout);
  }
}

/** Create a complete encrypted custom-format dump of the configured local database. */
export async function createDatabaseBackup(options: {
  connectionString: string;
  allowLocalInsecure: boolean;
  backupKey: Buffer;
  outputPath: string;
}): Promise<void> {
  const env = parseLoopbackAdminUrl(options.connectionString, options.allowLocalInsecure);
  if (options.backupKey.length !== 32) throw new Error('Backup encryption key is invalid');
  const outputPath = resolve(options.outputPath);
  const folder = await mkdtemp(resolve(dirname(outputPath), '.veycord-backup-'));
  const archivePath = resolve(folder, 'database.dump');
  const encryptedPath = resolve(dirname(outputPath), `.veycord-backup-${process.pid}-${randomUUID()}.tmp`);
  try {
    await dumpToBoundedPrivateFile(archivePath, env);
    await chmod(archivePath, 0o600);
    const archiveStat = await stat(archivePath);
    if (!archiveStat.isFile() || archiveStat.size < 1 || archiveStat.size > MAX_ARCHIVE_BYTES) {
      throw new Error('Database archive exceeds the supported backup size');
    }
    await encryptArchiveFile(archivePath, encryptedPath, options.backupKey);
    const envelopeStat = await stat(encryptedPath);
    if (envelopeStat.size > MAX_ENVELOPE_BYTES) throw new Error('Encrypted backup exceeds the supported size');
    await syncFile(encryptedPath);
    try {
      // link() publishes a complete inode atomically and fails if the destination already exists.
      await link(encryptedPath, outputPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Backup output already exists; choose a new filename');
      throw new Error('Could not publish the encrypted backup file');
    }
    await chmod(outputPath, 0o600);
    const directory = await open(dirname(outputPath), constants.O_RDONLY);
    try { await directory.sync(); } finally { await directory.close(); }
  } finally {
    await unlink(encryptedPath).catch(() => {});
    await rm(folder, { recursive: true, force: true });
  }
}

export async function runBackupCli(args = process.argv.slice(2), env = process.env): Promise<void> {
  if (args.length !== 2 || args[0] !== '--confirm-database-backup') {
    cliError('Usage: backup.ts --confirm-database-backup <new-output-file>');
  }
  const outputPath = args[1];
  if (!outputPath || outputPath.startsWith('-')) cliError('A backup output path is required');
  const connectionString = env.DATABASE_ADMIN_URL;
  if (!connectionString || connectionString.length > 4096) cliError('DATABASE_ADMIN_URL is missing or invalid');
  const key = parseBackupKey(env.SENTINEL_BACKUP_KEY);
  const allowLocalInsecure = env.DATABASE_ADMIN_ALLOW_LOCAL_INSECURE === 'true';
  if (env.DATABASE_ADMIN_ALLOW_LOCAL_INSECURE && env.DATABASE_ADMIN_ALLOW_LOCAL_INSECURE !== 'true' && env.DATABASE_ADMIN_ALLOW_LOCAL_INSECURE !== 'false') {
    cliError('DATABASE_ADMIN_ALLOW_LOCAL_INSECURE must be true or false');
  }
  await createDatabaseBackup({ connectionString, allowLocalInsecure, backupKey: key, outputPath });
  process.stdout.write('Encrypted database backup created. Protect the backup key separately from this file.\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBackupCli().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Database backup failed'}\n`);
    process.exitCode = 1;
  });
}
