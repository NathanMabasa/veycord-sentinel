import { createWriteStream, constants } from 'node:fs';
import { open, stat, unlink } from 'node:fs/promises';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { pipeline } from 'node:stream/promises';

export const BACKUP_MAGIC = Buffer.from('VYBK');
export const BACKUP_VERSION = 1;
export const BACKUP_KEY_ENV = 'SENTINEL_BACKUP_KEY';
export const MAX_ARCHIVE_BYTES = 256 * 1024 * 1024;
export const MAX_METADATA_BYTES = 4096;
export const GCM_NONCE_BYTES = 12;
export const GCM_TAG_BYTES = 16;
const FIXED_HEADER_BYTES = 4 + 1 + GCM_NONCE_BYTES + 4;
const READ_NOFOLLOW = constants.O_RDONLY | constants.O_NOFOLLOW;

export type BackupMetadata = {
  format: 'veycord-postgres-backup';
  version: 1;
  createdAt: string;
  archive: 'postgres-custom';
  encryption: 'aes-256-gcm';
};

export function parseBackupKey(value: string | undefined): Buffer {
  if (!value || !/^[A-Za-z0-9_-]{43}$/.test(value)) {
    throw new Error(`${BACKUP_KEY_ENV} must contain a generated 32-byte base64url key`);
  }
  const key = Buffer.from(value, 'base64url');
  if (key.length !== 32 || key.toString('base64url') !== value) {
    throw new Error(`${BACKUP_KEY_ENV} must contain a generated 32-byte base64url key`);
  }
  return key;
}

/** Build a minimal libpq environment without putting credentials in child-process arguments. */
export function parseLoopbackAdminUrl(connectionString: string, allowPlaintext: boolean): NodeJS.ProcessEnv {
  let url: URL;
  try { url = new URL(connectionString); }
  catch { throw new Error('PostgreSQL administrator configuration is invalid'); }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') throw new Error('PostgreSQL administrator configuration is invalid');
  const hostname = url.hostname.toLowerCase();
  const loopback = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
  if (!loopback || !url.username || !url.pathname || url.pathname === '/') {
    throw new Error('Backup and restore currently require a loopback PostgreSQL administrator connection');
  }
  const params = [...url.searchParams.entries()];
  if (params.some(([name]) => name !== 'sslmode')) throw new Error('PostgreSQL administrator URL has unsupported connection options');
  const sslmode = url.searchParams.get('sslmode');
  if (!allowPlaintext || (sslmode !== null && sslmode !== 'disable')) {
    throw new Error('Loopback plaintext database access requires the explicit local-insecure override');
  }
  const database = decodeURIComponent(url.pathname.slice(1));
  const username = decodeURIComponent(url.username);
  const password = decodeURIComponent(url.password);
  if (!database || !username || !password) throw new Error('PostgreSQL administrator configuration is invalid');
  // Keep libpq from interpreting an encoded database name as a replacement connection string.
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,62}$/.test(database) || !/^[A-Za-z0-9_][A-Za-z0-9_.-]{0,62}$/.test(username)) {
    throw new Error('PostgreSQL database and role names contain unsupported characters');
  }
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? '/usr/local/bin:/usr/bin:/bin',
    LANG: 'C',
    LC_ALL: 'C',
    PGHOST: hostname.startsWith('[') ? hostname.slice(1, -1) : hostname,
    PGPORT: url.port || '5432',
    PGDATABASE: database,
    PGUSER: username,
    PGPASSWORD: password,
    PGSSLMODE: 'disable',
    PGCONNECT_TIMEOUT: '5',
    PGAPPNAME: 'veycord-private-backup',
  };
  return env;
}

function metadataBytes(createdAt: string): Buffer {
  if (Number.isNaN(Date.parse(createdAt)) || new Date(createdAt).toISOString() !== createdAt) {
    throw new Error('Backup timestamp is invalid');
  }
  const metadata: BackupMetadata = {
    format: 'veycord-postgres-backup',
    version: 1,
    createdAt,
    archive: 'postgres-custom',
    encryption: 'aes-256-gcm',
  };
  const bytes = Buffer.from(JSON.stringify(metadata), 'utf8');
  if (bytes.length > MAX_METADATA_BYTES) throw new Error('Backup metadata exceeds the supported limit');
  return bytes;
}

function makeHeader(key: Buffer, createdAt: string, nonce = randomBytes(GCM_NONCE_BYTES)) {
  if (key.length !== 32) throw new Error('Backup encryption key is invalid');
  if (nonce.length !== GCM_NONCE_BYTES) throw new Error('Backup nonce is invalid');
  const metadata = metadataBytes(createdAt);
  const fixed = Buffer.alloc(FIXED_HEADER_BYTES);
  BACKUP_MAGIC.copy(fixed, 0);
  fixed.writeUInt8(BACKUP_VERSION, 4);
  nonce.copy(fixed, 5);
  fixed.writeUInt32BE(metadata.length, 5 + GCM_NONCE_BYTES);
  const aad = Buffer.concat([fixed, metadata]);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(aad);
  return { header: aad, cipher };
}

/** Encrypts a bounded pg_dump custom archive into a new mode-0600 envelope file. */
export async function encryptArchiveFile(archivePath: string, envelopePath: string, key: Buffer, createdAt = new Date().toISOString()): Promise<void> {
  const { header, cipher } = makeHeader(key, createdAt);
  const input = await open(archivePath, READ_NOFOLLOW).catch(() => {
    throw new Error('Could not read the database archive');
  });
  const archiveStat = await input.stat().catch(async () => {
    await input.close().catch(() => {});
    throw new Error('Could not read the database archive');
  });
  if (!archiveStat.isFile() || archiveStat.size < 1 || archiveStat.size > MAX_ARCHIVE_BYTES) {
    await input.close();
    throw new Error('Database archive exceeds the supported backup size');
  }
  const output = createWriteStream(envelopePath, { flags: 'wx', mode: 0o600 });
  let outputCreated = false;
  output.once('open', () => { outputCreated = true; });
  try {
    await new Promise<void>((resolve, reject) => {
      output.once('error', reject);
      output.write(header, (error) => error ? reject(error) : resolve());
    });
    await pipeline(input.createReadStream({ start: 0, end: archiveStat.size - 1, autoClose: false }), cipher, output, { end: false });
    await new Promise<void>((resolve, reject) => {
      output.end(cipher.getAuthTag(), (error?: Error | null) => error ? reject(error) : resolve());
    });
  } catch {
    output.destroy();
    if (outputCreated) await unlink(envelopePath).catch(() => {});
    throw new Error('Could not encrypt the database archive');
  } finally {
    await input.close().catch(() => {});
  }
  const envelopeStat = await stat(envelopePath);
  if (envelopeStat.size !== header.length + archiveStat.size + GCM_TAG_BYTES ||
      envelopeStat.size > MAX_ARCHIVE_BYTES + MAX_METADATA_BYTES + FIXED_HEADER_BYTES + GCM_TAG_BYTES) {
    await unlink(envelopePath).catch(() => {});
    throw new Error('Encrypted backup size does not match the bounded archive');
  }
}

async function readExact(file: Awaited<ReturnType<typeof open>>, length: number, position: number): Promise<Buffer> {
  const data = Buffer.alloc(length);
  let offset = 0;
  while (offset < length) {
    const result = await file.read(data, offset, length - offset, position + offset);
    if (!result.bytesRead) throw new Error('Backup envelope is truncated');
    offset += result.bytesRead;
  }
  return data;
}

function validateMetadata(value: unknown): BackupMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Backup metadata is invalid');
  const data = value as Record<string, unknown>;
  if (
    data.format !== 'veycord-postgres-backup' || data.version !== BACKUP_VERSION ||
    typeof data.createdAt !== 'string' || Number.isNaN(Date.parse(data.createdAt)) ||
    data.archive !== 'postgres-custom' || data.encryption !== 'aes-256-gcm' ||
    Object.keys(data).length !== 5
  ) throw new Error('Backup format or version is unsupported');
  return data as BackupMetadata;
}

/** Authenticates the complete envelope before the caller may inspect or restore the plaintext archive. */
export async function decryptArchiveFile(envelopePath: string, archivePath: string, key: Buffer): Promise<BackupMetadata> {
  if (key.length !== 32) throw new Error('Backup encryption key is invalid');
  let outputCreated = false;
  let input: Awaited<ReturnType<typeof open>> | undefined;
  try {
    input = await open(envelopePath, READ_NOFOLLOW);
    const envelopeStat = await input.stat();
    const maxEnvelope = MAX_ARCHIVE_BYTES + MAX_METADATA_BYTES + FIXED_HEADER_BYTES + GCM_TAG_BYTES;
    if (!envelopeStat.isFile() || envelopeStat.size > maxEnvelope || envelopeStat.size < FIXED_HEADER_BYTES + GCM_TAG_BYTES + 1) {
      throw new Error('Backup envelope size is invalid');
    }
    const fixed = await readExact(input, FIXED_HEADER_BYTES, 0);
    if (!fixed.subarray(0, 4).equals(BACKUP_MAGIC) || fixed.readUInt8(4) !== BACKUP_VERSION) {
      throw new Error('Backup format or version is unsupported');
    }
    const nonce = fixed.subarray(5, 5 + GCM_NONCE_BYTES);
    const metadataLength = fixed.readUInt32BE(5 + GCM_NONCE_BYTES);
    if (metadataLength < 1 || metadataLength > MAX_METADATA_BYTES) throw new Error('Backup metadata size is invalid');
    const metadataRaw = await readExact(input, metadataLength, FIXED_HEADER_BYTES);
    let metadata: BackupMetadata;
    try {
      metadata = validateMetadata(JSON.parse(metadataRaw.toString('utf8')));
    } catch {
      throw new Error('Backup metadata is invalid');
    }
    const header = Buffer.concat([fixed, metadataRaw]);
    const ciphertextStart = header.length;
    const ciphertextLength = envelopeStat.size - ciphertextStart - GCM_TAG_BYTES;
    if (ciphertextLength < 1 || ciphertextLength > MAX_ARCHIVE_BYTES) throw new Error('Backup archive size is invalid');
    const tag = await readExact(input, GCM_TAG_BYTES, envelopeStat.size - GCM_TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(header);
    decipher.setAuthTag(tag);
    const output = createWriteStream(archivePath, { flags: 'wx', mode: 0o600 });
    output.once('open', () => { outputCreated = true; });
    try {
      await pipeline(
        input.createReadStream({ start: ciphertextStart, end: envelopeStat.size - GCM_TAG_BYTES - 1, autoClose: false }),
        decipher,
        output,
      );
    } catch {
      if (!outputCreated) throw new Error('Could not create the decrypted archive file');
      throw new Error('Backup authentication failed or the encrypted archive is damaged');
    }
    const archiveStat = await stat(archivePath);
    if (archiveStat.size !== ciphertextLength) throw new Error('Decrypted archive length is invalid');
    return metadata;
  } catch (error) {
    if (outputCreated) await unlink(archivePath).catch(() => {});
    if (error instanceof Error && /^(Backup|Encrypted)/.test(error.message)) throw error;
    throw new Error('Could not read the encrypted backup');
  } finally {
    await input?.close().catch(() => {});
  }
}
