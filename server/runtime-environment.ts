import type { ServerEnvironment } from './gateway.js'

/** Dedicated application processes must not receive migration or recovery credentials. */
export function assertRuntimeEnvironment(env: ServerEnvironment): void {
  for (const field of ['DATABASE_ADMIN_URL','SENTINEL_APP_PASSWORD','POSTGRES_PASSWORD','RESTORE_DATABASE_ADMIN_URL','SENTINEL_BACKUP_KEY']) {
    if (env[field]) throw new Error('Administrative configuration must be kept outside the application runtime')
  }
}
