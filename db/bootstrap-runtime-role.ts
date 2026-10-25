import { createAdminPool, localInsecureFromEnv, requiredEnv } from './admin-connection.js'

const password = requiredEnv('SENTINEL_APP_PASSWORD')
if (password.length < 32) throw new Error('SENTINEL_APP_PASSWORD must be at least 32 characters')
const pool = createAdminPool(
  requiredEnv('DATABASE_ADMIN_URL'),
  localInsecureFromEnv('DATABASE_ADMIN_ALLOW_LOCAL_INSECURE'),
)

try {
  const client = await pool.connect()
  try {
    const existing = await client.query<{ exists: boolean }>("SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sentinel_app') AS exists")
    const command = existing.rows[0].exists
      ? "ALTER ROLE sentinel_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L"
      : "CREATE ROLE sentinel_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L"
    const formatted = await client.query<{ sql: string }>('SELECT format($1::text, $2::text) AS sql', [command, password])
    await client.query(formatted.rows[0].sql)
    const grant = await client.query<{ sql: string }>("SELECT format('GRANT CONNECT ON DATABASE %I TO sentinel_app', current_database()) AS sql")
    await client.query(grant.rows[0].sql)
  } finally {
    client.release()
  }
  process.stdout.write('Runtime role sentinel_app is ready with restricted privileges.\n')
} catch {
  process.stderr.write('Could not prepare the runtime role; verify private admin permissions and server availability.\n')
  process.exitCode = 1
} finally {
  await pool.end()
}
