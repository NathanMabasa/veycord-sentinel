import { IDENTITY_SCHEMA_VERSION } from '../../server/identity/schema-version.js'
import { readFile } from 'node:fs/promises'
import { createAdminPool, requiredEnv, localInsecureFromEnv } from '../admin-connection.js'

const password=requiredEnv('SENTINEL_AUTH_RUNTIME_PASSWORD')
if(!/^[A-Za-z0-9_-]{43,128}$/.test(password))throw new Error('Identity runtime password must be a separately generated base64url secret')
const url=new URL(requiredEnv('DATABASE_ADMIN_URL'));url.searchParams.set('options','-c search_path=sentinel_identity')
const pool=createAdminPool(url.toString(),localInsecureFromEnv('DATABASE_ADMIN_ALLOW_LOCAL_INSECURE'))
try {
  const client=await pool.connect()
  try {
    await client.query('BEGIN');await client.query('SELECT pg_advisory_xact_lock(728240036)')
    const existing=(await client.query("SELECT 1 FROM pg_roles WHERE rolname='sentinel_identity_app'")).rowCount
    const formatted=(await client.query<{sql:string}>('SELECT format($1::text,$2::text) AS sql',[(existing?'ALTER':'CREATE')+' ROLE sentinel_identity_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD %L',password])).rows[0].sql
    await client.query(formatted)
    await client.query('CREATE SCHEMA IF NOT EXISTS sentinel_identity')
    await client.query('REVOKE ALL ON SCHEMA sentinel_identity FROM PUBLIC')
    await client.query('CREATE TABLE IF NOT EXISTS sentinel_identity.schema_version (version integer PRIMARY KEY)')
    const applied = (await client.query<{version:number}>('SELECT version FROM sentinel_identity.schema_version ORDER BY version')).rows.map(row=>row.version)
    if (applied.some((version,index)=>version!==index+1) || applied.length>IDENTITY_SCHEMA_VERSION) throw new Error('Unsupported identity schema version')
    const migrations = ['001_schema.sql', '002_workspace_budgets.sql']
    for (let index=applied.length;index<IDENTITY_SCHEMA_VERSION;index++) {
      await client.query(await readFile(new URL(migrations[index],import.meta.url),'utf8'))
      await client.query('INSERT INTO sentinel_identity.schema_version VALUES ($1)',[index+1])
    }
    await client.query('GRANT USAGE ON SCHEMA sentinel_identity TO sentinel_identity_app')
    await client.query('GRANT SELECT,INSERT,UPDATE,DELETE ON sentinel_identity."user",sentinel_identity.session,sentinel_identity.account,sentinel_identity.verification,sentinel_identity."twoFactor",sentinel_identity."rateLimit",sentinel_identity.request_budget TO sentinel_identity_app')
    await client.query('GRANT SELECT,INSERT,UPDATE ON sentinel_identity.workspace_budget TO sentinel_identity_app')
    await client.query('GRANT SELECT ON sentinel_identity.memberships,sentinel_identity.schema_version TO sentinel_identity_app')
    await client.query('GRANT INSERT ON sentinel_identity.security_audit TO sentinel_identity_app')
    await client.query('COMMIT')
    process.stdout.write('Identity schema and separate restricted runtime role are ready. No accounts were created.\n')
  } catch {await client.query('ROLLBACK');throw new Error('Identity setup failed; private database details suppressed')} finally {client.release()}
} catch {process.stderr.write('Identity setup failed. Verify the administrator configuration and reviewed SQL.\n');process.exitCode=1} finally {await pool.end()}
