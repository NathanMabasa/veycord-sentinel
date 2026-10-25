import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtimeFields = ['DATABASE_URL', 'SENTINEL_PRIVATE_ENABLED', 'SENTINEL_WORKSPACE_ID', 'SENTINEL_API_TOKEN', 'SENTINEL_ALLOW_LOCAL_DATABASE', 'SENTINEL_HOST', 'SENTINEL_PORT', 'SENTINEL_ALLOW_NETWORK_BIND'];
export async function createRuntimeEnv(env = process.env, directory = process.cwd()) {
  const lines = ['# Runtime-only secrets. No migration, restore or encryption keys belong here.'];
  if (env.SENTINEL_PRIVATE_ENABLED === 'true' && (!env.DATABASE_URL || !env.SENTINEL_WORKSPACE_ID || !env.SENTINEL_API_TOKEN)) throw new Error('Private runtime configuration is incomplete');
  for (const name of runtimeFields) {
    const value = env[name];
    if (value === undefined) continue;
    if (value.length > 4096 || /[\r\n"'`]/.test(value)) throw new Error('Runtime values must be single-line and URL-encode special credential characters');
    lines.push(`${name}="${value}"`);
  }
  const file = await open(resolve(directory, '.env.runtime'), 'wx', 0o600);
  try { await file.writeFile(lines.join('\n') + '\n'); await file.sync(); }
  finally { await file.close(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  createRuntimeEnv().then(() => process.stdout.write('Created private .env.runtime with runtime settings only. Existing files are never overwritten.\n')).catch(() => {
    process.stderr.write('Could not create .env.runtime. Check required configuration and whether the private file already exists.\n');
    process.exitCode = 1;
  });
}
