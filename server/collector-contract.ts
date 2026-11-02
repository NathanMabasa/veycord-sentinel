import { createHash, randomBytes } from 'node:crypto'

export const COLLECTOR_PREFIX = '/api/collector/v1'
export const COLLECTOR_TOKEN_PATTERN = /^vsc_[A-Za-z0-9_-]{43}$/
export const COLLECTOR_SOURCE_PATTERN = /^[a-z][a-z0-9._-]{0,79}$/
export function newCollectorToken(): string { return `vsc_${randomBytes(32).toString('base64url')}` }
export function collectorTokenHash(token: string): string {
  if (!COLLECTOR_TOKEN_PATTERN.test(token)) throw new Error('Invalid collector credential')
  return createHash('sha256').update(token).digest('hex')
}
export class CollectorDeniedError extends Error {
  constructor() { super('Collector credential is unavailable'); this.name = 'CollectorDeniedError' }
}
export type CollectorDecision = null | { allowed: false; retryAfterSeconds: number } | { allowed: true; source: string; id: string }
