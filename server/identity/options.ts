import { betterAuth } from 'better-auth'
import { twoFactor } from 'better-auth/plugins/two-factor'
import type { Pool } from 'pg'
import type { IdentityConfig } from './config.js'

/** Shared with the offline schema/bootstrap tool. Never mounted with registration enabled. */
export function makeIdentity(config: IdentityConfig, pool: Pool, bootstrap = false) {
  return betterAuth({
    appName: 'Veycord Sentinel', baseURL: config.origin, basePath: '/api/auth', secret: config.secret,
    database: pool, trustedOrigins: [config.origin], telemetry: { enabled: false }, logger: { disabled: true },
    emailAndPassword: { enabled: true, disableSignUp: !bootstrap, minPasswordLength: 14, maxPasswordLength: 128, revokeSessionsOnPasswordReset: true },
    session: { expiresIn: 8 * 3600, disableSessionRefresh: true, freshAge: 300, cookieCache: { enabled: false }, additionalFields: {
      mfaVerifiedAt: { type: 'date', required: false, input: false },
      lastActiveAt: { type: 'date', required: true, input: false, defaultValue: () => new Date() },
    } },
    advanced: { useSecureCookies: config.origin.startsWith('https:'), cookiePrefix: 'veycord', defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', path: '/' }, ipAddress: { ipAddressHeaders: [] } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 30 },
    plugins: [twoFactor({ issuer: 'Veycord Sentinel', skipVerificationOnEnable: false, twoFactorCookieMaxAge: 300 })],
  })
}
