import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Pool } from 'pg'

const DEFAULT_MIGRATION_DIRECTORY = join(dirname(fileURLToPath(import.meta.url)), 'migrations')
const MIGRATION_LOCK_ID = 728240031

export async function listMigrationFiles(migrationDirectory = DEFAULT_MIGRATION_DIRECTORY): Promise<string[]> {
  return (await readdir(migrationDirectory))
    .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
    .sort()
}

export interface ApplyMigrationsOptions {
  pool: Pool
  migrationDirectory?: string
  /** Require a restored Sentinel migration history table and its first migration. */
  requireBaseline?: boolean
  onApplied?: (filename: string) => void
}

/** Apply the repository's numbered migrations with the same lock and per-file transaction used by the CLI. */
export async function applyMigrations(options: ApplyMigrationsOptions): Promise<string[]> {
  const migrationDirectory = options.migrationDirectory ?? DEFAULT_MIGRATION_DIRECTORY
  const files = await listMigrationFiles(migrationDirectory)
  if (files.length === 0 || files[0] !== '001_initial_schema.sql') {
    throw new Error('Supported Sentinel migration baseline is unavailable')
  }

  const client = await options.pool.connect()
  let lockAcquired = false
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID])
    lockAcquired = true
    const historyExists = (await client.query<{ present: boolean }>(
      "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS present",
    )).rows[0]?.present === true

    if (options.requireBaseline && !historyExists) {
      throw new Error('Restored database does not contain Sentinel migration history')
    }
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      version text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`)
    const appliedRows = await client.query<{ version: string }>('SELECT version FROM schema_migrations')
    const applied = new Set(appliedRows.rows.map((row) => row.version))
    const supported = new Set(files)
    const unsupported = [...applied].filter((version) => !supported.has(version))
    if (unsupported.length > 0) {
      throw new Error('Database contains an unsupported or newer migration version')
    }
    if (options.requireBaseline && !applied.has(files[0])) {
      throw new Error('Restored database is missing the supported Sentinel baseline migration')
    }

    const newlyApplied: string[] = []
    for (const filename of files) {
      if (applied.has(filename)) continue
      const source = await readFile(join(migrationDirectory, filename), 'utf8')
      await client.query('BEGIN')
      try {
        await client.query(source)
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [filename])
        await client.query('COMMIT')
      } catch {
        await client.query('ROLLBACK').catch(() => {})
        throw new Error(`Migration ${filename} failed; database error details were suppressed`)
      }
      newlyApplied.push(filename)
      options.onApplied?.(filename)
    }
    return newlyApplied
  } finally {
    if (lockAcquired) await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {})
    client.release()
  }
}
