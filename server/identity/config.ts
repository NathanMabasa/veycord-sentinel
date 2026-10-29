import type { PoolConfig } from 'pg'

export type IdentityConfig = { origin: string; secret: string; database: string; local: boolean; workspaceId: string }
export function identityConfig(env: Record<string, string | undefined>): IdentityConfig | null {
  if (env.SENTINEL_AUTH_ENABLED === undefined || env.SENTINEL_AUTH_ENABLED === 'false') return null
  if (env.SENTINEL_AUTH_ENABLED !== 'true') throw new Error('Identity enablement is invalid')
  try {
    const url = new URL(env.SENTINEL_AUTH_ORIGIN ?? '')
    const local = env.SENTINEL_AUTH_ALLOW_LOCAL === 'true'
    const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(url.protocol === 'http:' && local && loopback))) throw new Error()
    const secret = env.SENTINEL_AUTH_SECRET ?? ''
    const database = env.SENTINEL_AUTH_DATABASE_URL ?? ''
    const workspaceId = env.SENTINEL_WORKSPACE_ID ?? ''
    if (!/^[A-Za-z0-9_-]{43,128}$/.test(secret) || !database || !/^[a-f0-9-]{36}$/i.test(workspaceId) || secret === env.SENTINEL_API_TOKEN) throw new Error()
    identityPoolOptions(database, local)
    return { origin: url.origin, secret, database, local, workspaceId }
  } catch { throw new Error('Identity configuration is incomplete or unsafe') }
}

export function identityPoolOptions(connectionString: string, local: boolean): PoolConfig {
  const url = new URL(connectionString)
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || url.searchParams.has('options') || ['sslkey','sslcert','sslrootcert'].some(key => url.searchParams.has(key))) throw new Error('Identity database configuration is invalid')
  const loopback = ['127.0.0.1','localhost','[::1]','::1'].includes(url.hostname)
  const sslmode = url.searchParams.get('sslmode')
  const ssl = sslmode === 'verify-full' ? { rejectUnauthorized: true as const } : loopback && local && (sslmode === 'disable' || sslmode === null) ? false : null
  if (ssl === null) throw new Error('Identity database requires verified TLS')
  url.searchParams.delete('sslmode')
  return { connectionString: url.toString(), ssl, options: '-c search_path=sentinel_identity', max: 3, connectionTimeoutMillis: 3000, idleTimeoutMillis: 10000, statement_timeout: 10000, query_timeout: 12000 }
}
