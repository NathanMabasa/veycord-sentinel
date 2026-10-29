import { Pool } from 'pg'
import { assertDatabaseUrlParameters } from '../server/database-url-policy.js'

export function createAdminPool(connectionString: string, allowLocalInsecure: boolean): Pool {
  let parsed: URL
  try {
    parsed = new URL(connectionString)
  } catch {
    throw new Error('Database admin configuration is invalid')
  }
  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') throw new Error('Database admin configuration is invalid')
  assertDatabaseUrlParameters(parsed, true)
  const host = parsed.hostname.toLowerCase()
  const loopback = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]'
  const sslmode = parsed.searchParams.get('sslmode')
  if (parsed.searchParams.has('sslcert') || parsed.searchParams.has('sslkey') || parsed.searchParams.has('sslrootcert')) {
    throw new Error('Database TLS settings must use the platform trust store')
  }
  let ssl: false | { rejectUnauthorized: true }
  if (sslmode === 'verify-full') {
    ssl = { rejectUnauthorized: true }
    parsed.searchParams.delete('sslmode')
  } else if (loopback && allowLocalInsecure && (sslmode === null || sslmode === 'disable')) {
    ssl = false
    parsed.searchParams.delete('sslmode')
  } else {
    throw new Error('Remote PostgreSQL requires sslmode=verify-full; local plaintext requires an explicit local override')
  }
  const pool = new Pool({
    connectionString: parsed.toString(),
    ssl,
    max: 2,
    connectionTimeoutMillis: 3000,
    idleTimeoutMillis: 10000,
    statement_timeout: 10000,
    query_timeout: 12000,
  })
  pool.on('error', () => {})
  return pool
}

export function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.length > 4096) throw new Error(`Required environment setting ${name} is missing or invalid`)
  return value
}

export function localInsecureFromEnv(name: string): boolean {
  const value = process.env[name]
  if (value === undefined || value === 'false') return false
  if (value === 'true') return true
  throw new Error(`Environment setting ${name} must be true or false`)
}
