import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { applyMigrations } from './migration-runner.js'
import { createAdminPool } from './admin-connection.js'

export async function runMigrationsCli(env = process.env): Promise<void> {
  const pool = createAdminPool(
    requiredEnvFrom(env, 'DATABASE_ADMIN_URL'),
    localInsecureFrom(env, 'DATABASE_ADMIN_ALLOW_LOCAL_INSECURE'),
  )
  try {
    await applyMigrations({ pool, onApplied: (filename) => process.stdout.write(`Applied ${filename}\n`) })
  } catch (error) {
    const message = error instanceof Error && error.message.startsWith('Migration ')
      ? error.message
      : error instanceof Error && error.message.includes('unsupported or newer migration')
        ? error.message
        : 'Database migration failed; verify private admin configuration and server availability'
    throw new Error(message)
  } finally {
    await pool.end()
  }
}

function requiredEnvFrom(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]
  if (!value || value.length > 4096) throw new Error(`Required environment setting ${name} is missing or invalid`)
  return value
}

function localInsecureFrom(env: NodeJS.ProcessEnv, name: string): boolean {
  const value = env[name]
  if (value === undefined || value === 'false') return false
  if (value === 'true') return true
  throw new Error(`Environment setting ${name} must be true or false`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runMigrationsCli().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Database migration failed'}\n`)
    process.exitCode = 1
  })
}
