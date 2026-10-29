import { Pool } from 'pg'
import { createHash } from 'node:crypto'
import { identityPoolOptions, type IdentityConfig } from './config.js'
import { makeIdentity } from './options.js'

const WORKSPACE_READ = new Set(['/health', '/rules', '/summary', '/analytics', '/events', '/findings', '/cases'])
const CASE_ITEM = /^\/cases\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const AUTH_POST = new Set(['/sign-in/email','/sign-out','/two-factor/enable','/two-factor/verify-totp','/two-factor/verify-backup-code','/change-password','/revoke-other-sessions'])
export type WorkspaceRole = 'admin' | 'analyst' | 'viewer'
export function identityError(status: number, code: string, message: string) {
  return Response.json({ error: { code, message } }, { status, headers: { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' } })
}
export async function createIdentityService(config: IdentityConfig) {
  const pool = new Pool(identityPoolOptions(config.database, config.local)); pool.on('error', () => {})
  try {
    const row = (await pool.query<{ unsafe: boolean }>(`
      SELECT (
        r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR r.rolcreaterole OR r.rolinherit
        OR EXISTS (SELECT 1 FROM pg_auth_members WHERE member = r.oid)
        OR EXISTS (
          SELECT 1 FROM pg_class owned JOIN pg_namespace ns ON ns.oid = owned.relnamespace
          WHERE owned.relowner = r.oid AND ns.nspname IN ('sentinel_identity', 'public')
        )
        OR has_schema_privilege(current_user, 'sentinel_identity', 'CREATE')
        OR has_schema_privilege(current_user, 'public', 'CREATE')
        OR has_table_privilege(current_user, 'sentinel_identity.memberships', 'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')
        OR has_table_privilege(current_user, 'sentinel_identity.security_audit', 'UPDATE,DELETE,TRUNCATE,TRIGGER')
        OR EXISTS (
          SELECT 1 FROM pg_class telemetry JOIN pg_namespace ns ON ns.oid = telemetry.relnamespace
          WHERE ns.nspname = 'public' AND telemetry.relkind IN ('r','p','v','m','f')
            AND has_table_privilege(current_user, telemetry.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')
        )
      ) AS unsafe FROM pg_roles r WHERE r.rolname = current_user
    `)).rows[0]
    if (!row || row.unsafe) throw new Error('Identity role must be restricted')
  } catch { await pool.end(); throw new Error('Identity database schema or runtime privileges are invalid') }
  const auth = makeIdentity(config, pool)
  async function audit(action: string, userId: string | null, success: boolean) {
    await pool.query('INSERT INTO sentinel_identity.security_audit (action,user_id,success) VALUES ($1,$2,$3)', [action,userId,success])
  }
  async function session(request: Request) {
    const current = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } })
    if (!current) return null
    const active = await pool.query<{ mfaVerifiedAt: Date | null }>(`UPDATE sentinel_identity.session SET "lastActiveAt"=now() WHERE id=$1 AND "lastActiveAt">now()-interval '30 minutes' AND "createdAt">now()-interval '8 hours' AND "expiresAt">now() RETURNING "mfaVerifiedAt"`, [current.session.id])
    if (!active.rows[0]) { await pool.query('DELETE FROM sentinel_identity.session WHERE id=$1',[current.session.id]); return null }
    const membership = (await pool.query<{ role: WorkspaceRole }>('SELECT role FROM sentinel_identity.memberships WHERE user_id=$1 AND workspace_id=$2 AND active=true',[current.user.id,config.workspaceId])).rows[0]
    return { userId: current.user.id, name: current.user.name, email: current.user.email, sessionId:current.session.id, enrolled: current.user.twoFactorEnabled === true, mfa: current.user.twoFactorEnabled === true && active.rows[0].mfaVerifiedAt !== null, verifiedAt:active.rows[0].mfaVerifiedAt, role: membership?.role ?? null }
  }
  async function handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url)
      if (url.origin !== config.origin || url.search) return identityError(400,'INVALID_REQUEST','Authentication request could not be validated')
      if (url.pathname === '/api/session/v1') {
        if (request.method !== 'GET') return identityError(405,'METHOD_NOT_ALLOWED','Method not allowed')
        const current = await session(request)
        return Response.json({ data: current ? { name: current.name, email: current.email, enrolled:current.enrolled, mfa:current.mfa, role:current.role } : null },{headers:{'Cache-Control':'no-store'}})
      }
      const path = url.pathname.slice('/api/auth'.length)
      if (request.method !== 'POST' || !AUTH_POST.has(path)) return identityError(404,'NOT_FOUND','Authentication route not available')
      if (request.headers.get('origin') !== config.origin || !/^application\/json(?:;.*)?$/i.test(request.headers.get('content-type') ?? '')) return identityError(403,'ORIGIN_FORBIDDEN','Use the configured private application origin')
      const reader=request.body?.getReader(); const chunks:Uint8Array[]=[]; let size=0
      if (reader) { try { while(true){ const part=await reader.read(); if(part.done)break; size+=part.value.byteLength; if(size>8192){await reader.cancel();return identityError(413,'BODY_TOO_LARGE','Authentication request is too large')} chunks.push(part.value) } } finally {reader.releaseLock()} }
      const bytes=new Uint8Array(size); let offset=0; for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
      let body: Record<string,unknown>
      try { const value:unknown=JSON.parse(new TextDecoder().decode(bytes)); if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();body=value as Record<string,unknown> } catch {return identityError(400,'INVALID_REQUEST','Authentication request could not be validated')}
      // Never accept remembered-device bypass or alternate enrollment methods.
      delete body.trustDevice; if(path==='/two-factor/enable')body.method='totp'
      if (path === '/change-password' || path === '/revoke-other-sessions') {
        const current=await session(request)
        if(!current?.mfa || !current.verifiedAt || Date.now()-current.verifiedAt.getTime()>300000) return identityError(403,'FRESH_MFA_REQUIRED','Verify an authenticator code before changing account security')
        if(path==='/change-password')body.revokeOtherSessions=true
      }
      const bucket=createHash('sha256').update(path).digest('hex')
      const count=(await pool.query<{ attempts:number }>(`INSERT INTO sentinel_identity.request_budget (bucket,started_at,attempts) VALUES ($1,date_trunc('minute',now()),1) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN request_budget.started_at<date_trunc('minute',now()) THEN 1 ELSE request_budget.attempts+1 END, started_at=date_trunc('minute',now()) RETURNING attempts`,[bucket])).rows[0].attempts
      if(count>30)return identityError(429,'RATE_LIMITED','Too many authentication requests. Wait a minute and try again.')
      const headers=new Headers(request.headers); headers.delete('content-length'); headers.delete('x-forwarded-for');headers.delete('x-real-ip');headers.delete('cf-connecting-ip')
      if(path==='/sign-in/email')headers.delete('cookie')
      const actorBefore = path === '/sign-in/email' ? null : await session(request)
      const result=await auth.handler(new Request(request.url,{method:'POST',headers,body:JSON.stringify(body)}))
      const responseHeaders=new Headers(result.headers); responseHeaders.set('Cache-Control','no-store')
      let data: Record<string,unknown>
      try {data=await result.json() as Record<string,unknown>} catch {return identityError(503,'AUTH_UNAVAILABLE','Authentication could not be completed')}
      if(result.ok && (path==='/two-factor/verify-totp'||path==='/two-factor/verify-backup-code')) {
        const cookieMap=new Map((request.headers.get('cookie')??'').split(';').map(pair=>{const i=pair.indexOf('=');return [pair.slice(0,i).trim(),pair.slice(i+1)] as [string,string]}).filter(([key])=>Boolean(key)))
        for(const cookie of result.headers.getSetCookie()){const pair=cookie.split(';')[0];const i=pair.indexOf('=');cookieMap.set(pair.slice(0,i),pair.slice(i+1))}
        const confirmedHeaders=new Headers(request.headers);confirmedHeaders.set('cookie',[...cookieMap].map(([key,value])=>`${key}=${value}`).join('; '))
        const confirmed=await auth.api.getSession({headers:confirmedHeaders,query:{disableCookieCache:true}})
        if(!confirmed?.user.twoFactorEnabled) return identityError(503,'MFA_UNAVAILABLE','Sign in again to complete verification')
        await pool.query('UPDATE sentinel_identity.session SET "mfaVerifiedAt"=now(),"lastActiveAt"=now() WHERE id=$1',[confirmed.session.id])
        await audit('mfa.verified',confirmed.user.id,true)
      } else { await audit(path.replaceAll('/','.').slice(1),actorBefore?.userId??null,result.ok) }
      if(!result.ok)return new Response(JSON.stringify({error:{code:'AUTH_REJECTED',message:result.status===429?'Too many attempts. Wait before trying again.':'The credentials or verification code were not accepted.'}}),{status:result.status>=500?503:result.status,headers:responseHeaders})
      // Opaque cookies handle sessions. Never send the raw library token to the browser JSON client.
      delete data.token; delete data.session; delete data.user
      return new Response(JSON.stringify(data),{status:result.status,headers:responseHeaders})
    } catch {return identityError(503,'AUTH_UNAVAILABLE','Authentication is temporarily unavailable. Contact your operator.')}
  }
  async function authorize(request: Request) {
    const url = new URL(request.url)
    // Hono decodes percent-encoded static paths. Reject aliases before evaluating
    // permissions so the authorization policy and router cannot see different routes.
    if (url.pathname.includes('%')) return { response: identityError(400, 'INVALID_REQUEST', 'Use a canonical workspace route') }
    const read = request.method === 'GET' || request.method === 'HEAD'
    if (url.origin !== config.origin || (!read && request.headers.get('origin') !== config.origin)) {
      return { response: identityError(403, 'ORIGIN_FORBIDDEN', 'Workspace origin is not allowed') }
    }
    const current = await session(request)
    if (!current) return { response: identityError(401, 'AUTH_REQUIRED', 'Sign in to the private application') }
    if (!current.mfa || !current.role) return { response: identityError(403, 'ACCESS_DENIED', 'Verified MFA and workspace membership are required') }
    const path = url.pathname.slice('/api/workspace/v1'.length)
    const caseWrite = (request.method === 'POST' && path === '/cases') || (request.method === 'PATCH' && CASE_ITEM.test(path))
    const permitted = current.role === 'admin' || (read && WORKSPACE_READ.has(path)) || (current.role === 'analyst' && caseWrite)
    if (!permitted) {
      await audit('workspace.denied', current.userId, false)
      return { response: identityError(403, 'ACCESS_DENIED', 'Your workspace role does not allow this action') }
    }
    return { userId: current.userId, role: current.role }
  }
  return {handle,authorize,close:()=>pool.end()}
}
