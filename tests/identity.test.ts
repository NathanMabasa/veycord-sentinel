import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { execFile as execCallback, spawn } from 'node:child_process'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Pool } from 'pg'
import { createGateway } from '../server/gateway.js'
import { createIdentityService } from '../server/identity/service.js'
import { identityConfig, identityPoolOptions } from '../server/identity/config.js'
import { identityFixture } from './helpers/identity-fixture.js'
const execFile=promisify(execCallback)
// Fixture-only RFC6238 generator; the application delegates verification to Better Auth.
function totp(secret:string){
  const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=''
  for(const char of secret.toUpperCase().replace(/=+$/,''))bits+=alphabet.indexOf(char).toString(2).padStart(5,'0')
  const bytes=[];for(let i=0;i+8<=bits.length;i+=8)bytes.push(parseInt(bits.slice(i,i+8),2))
  const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(Date.now()/30000)))
  const digest=createHmac('sha1',Buffer.from(bytes)).update(counter).digest();const offset=digest[19]&15
  return String((digest.readUInt32BE(offset)&0x7fffffff)%1000000).padStart(6,'0')
}
test('private identity integration: MFA, recovery, revocation, roles, expiry and attributed audit', {timeout:180000}, async t=>{
  try{await execFile('initdb',['--version']);await execFile('pg_ctl',['--version'])}catch{
    if(process.env.CI||process.env.GITHUB_ACTIONS)throw new Error('PostgreSQL binaries required in CI')
    t.skip('PostgreSQL binaries unavailable; identity integration not exercised');return
  }
  const fixture=await identityFixture();const {admin,env,operator}=fixture;const origin=env.SENTINEL_AUTH_ORIGIN
  const gateway=createGateway(env)
  // Each scenario starts with fresh limiter state in this disposable test database.
  const resetBudgets=()=>admin.query('TRUNCATE sentinel_identity."rateLimit",sentinel_identity.request_budget')
  t.beforeEach(async()=>{await resetBudgets()})
  class Client {
    cookies=new Map<string,string>()
    async request(path:string,body?:unknown,headers:Record<string,string>={},method=body===undefined?'GET':'POST'){
      const response=await gateway.fetch(new Request(origin+path,{method,headers:{cookie:[...this.cookies].map(([k,v])=>`${k}=${v}`).join('; '),...(body===undefined?{}:{origin,'content-type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)}))
      for(const cookie of response.headers.getSetCookie()){const pair=cookie.split(';')[0];const i=pair.indexOf('=');const name=pair.slice(0,i),value=pair.slice(i+1);if(value)this.cookies.set(name,value);else this.cookies.delete(name)}
      return response
    }
  }
  const users:Record<string,{email:string;password:string;id:string;secret:string;codes:string[];client:Client}>={}
  async function signIn(role:string){await resetBudgets();const user=users[role];const client=new Client();const login=await client.request('/api/auth/sign-in/email',{email:user.email,password:user.password,trustDevice:true});assert.equal(login.status,200);assert.equal((await login.json()).twoFactorRedirect,true);assert.equal((await client.request('/api/workspace/v1/summary')).status,401);assert.equal((await client.request('/api/auth/two-factor/verify-totp',{code:totp(user.secret),trustDevice:true})).status,200);return client}
  try {
    await t.test('anonymous, alternative routes, origin, content type and body bounds fail closed',async()=>{
      const client=new Client();assert.equal((await client.request('/api/workspace/v1/summary')).status,401)
      for(const path of ['/sign-up/email','/sign-in/social','/sign-in/magic-link','/two-factor/disable','/get-session','/two-factor/send-otp'])assert.equal((await client.request('/api/auth'+path,{})).status,404)
      assert.equal((await client.request('/api/auth/sign-in/email',{}, {origin:'https://foreign.example'})).status,403)
      assert.equal((await client.request('/api/auth/sign-in/email',{}, {origin:''})).status,403)
      assert.equal((await client.request('/api/auth/sign-in/email',{}, {'content-type':'text/plain'})).status,403)
      assert.equal((await client.request('/api/auth/sign-in/email',{padding:'x'.repeat(8192)})).status,413)
      assert.equal((await client.request('/api/auth/sign-in/email?redirect=elsewhere',{})).status,400)
      assert.equal((await client.request('/api/workspace/v1/summary',undefined,{authorization:`Bearer ${env.SENTINEL_API_TOKEN}`})).status,401)
      assert.equal((await gateway.fetch(new Request('https://foreign.example/api/session/v1'))).status,400)
    })
    for(const role of ['admin','analyst','viewer'])await t.test(`${role}: password-only is denied; enrollment establishes server MFA assurance`,async()=>{
      const email=`${role}@example.test`;const password=randomBytes(24).toString('base64url');await operator('provision',{email,password,name:`Synthetic ${role}`,role})
      const id=(await admin.query('SELECT id FROM sentinel_identity."user" WHERE email=$1',[email])).rows[0].id as string
      const client=new Client();const login=await client.request('/api/auth/sign-in/email',{email,password,mfaVerifiedAt:new Date().toISOString(),twoFactorEnabled:true})
      assert.equal(login.status,200);assert.equal(login.headers.get('cache-control'),'no-store');assert.ok(!('token' in await login.json()))
      assert.equal((await client.request('/api/workspace/v1/summary')).status,403)
      // Changing the profile flag alone cannot elevate this existing session.
      await admin.query('UPDATE sentinel_identity."user" SET "twoFactorEnabled"=true WHERE id=$1',[id]);assert.equal((await client.request('/api/workspace/v1/summary')).status,403)
      await admin.query('UPDATE sentinel_identity."user" SET "twoFactorEnabled"=false WHERE id=$1',[id])
      const enabled=await client.request('/api/auth/two-factor/enable',{password,method:'otp'});assert.equal(enabled.status,200)
      const setup=await enabled.json();assert.equal(setup.method,'totp');const secret=new URL(setup.totpURI).searchParams.get('secret')!;assert.ok(secret)
      assert.equal((await client.request('/api/workspace/v1/summary')).status,403)
      const verified=await client.request('/api/auth/two-factor/verify-totp',{code:totp(secret)});assert.equal(verified.status,200)
      assert.ok(verified.headers.getSetCookie().some(cookie=>/session_token=/.test(cookie)&&/HttpOnly/i.test(cookie)&&/SameSite=Lax/i.test(cookie)))
      assert.equal((await client.request('/api/workspace/v1/summary')).status,200)
      const metadata=await (await client.request('/api/session/v1')).json();assert.equal(metadata.data.role,role);assert.equal(metadata.data.mfa,true);assert.ok(!JSON.stringify(metadata).includes('token'))
      users[role]={email,password,id,secret,codes:setup.backupCodes,client}
    })
    await t.test('role-negative mutations, operations, audit and cross-workspace references',async()=>{
      const findings=await (await users.admin.client.request('/api/workspace/v1/findings')).json();const findingId=findings.data[0].id
      for(const role of ['admin','analyst','viewer']){
        const client=users[role].client
        assert.equal((await client.request('/api/workspace/v1/operations')).status,role==='admin'?200:403)
        assert.equal((await client.request('/api/workspace/v1/audit')).status,role==='admin'?200:403)
        assert.equal((await client.request('/api/workspace/v1/events', {events:[]})).status,role==='admin'?400:403)
        assert.equal((await client.request('/api/workspace/v1/cases',{title:'Synthetic permission test',note:'Regression fixture',findingId})).status,role==='viewer'?403:201)
        assert.equal((await client.request('/api/workspace/v1/cases',{title:'CSRF'}, {origin:'https://foreign.example'})).status,403)
      }
      assert.equal((await users.analyst.client.request('/api/workspace/v1/cases',{title:'Foreign finding',note:'',findingId:randomUUID()})).status,404)
      assert.equal((await users.viewer.client.request('/api/workspace/v1/cases',{title:'Forge role',role:'admin',workspaceId:randomUUID(),findingId})).status,403)
    })
    await t.test('case update permissions are enforced for each role',async()=>{
      const data=await (await users.admin.client.request('/api/workspace/v1/cases')).json();const id=data.data[0].id
      for(const role of ['admin','analyst','viewer'])assert.equal((await users[role].client.request('/api/workspace/v1/cases/'+id,{note:'Verified case update'},{},'PATCH')).status,role==='viewer'?403:200)
    })
    await t.test('encoded admin-only routes cannot bypass role checks',async()=>{
      for(const role of ['analyst','viewer'])for(const path of ['/%61udit','/%6fperations'])assert.equal((await users[role].client.request('/api/workspace/v1'+path)).status,400)
    })
    await t.test('concurrent user mutations retain distinct server audit attribution',async()=>{
      const findings=await (await users.admin.client.request('/api/workspace/v1/findings')).json();const findingId=findings.data[0].id
      await Promise.all(['admin','analyst'].map(async role=>assert.equal((await users[role].client.request('/api/workspace/v1/cases',{title:`Attribution ${role}`,note:'',findingId})).status,201)))
      const entries=(await admin.query("SELECT details FROM public.audit_entries WHERE workspace_id=$1 AND actor='user' AND action='case.created'",[fixture.workspaceId])).rows
      assert.ok(entries.some(r=>r.details.actorId===users.admin.id));assert.ok(entries.some(r=>r.details.actorId===users.analyst.id));assert.ok(entries.every(r=>r.details.actorId!==users.viewer.id))
      assert.equal((await users.admin.client.request('/api/workspace/v1/cases',{title:'Spoof actor',findingId,actorId:users.viewer.id})).status,400)
    })
    await t.test('recovery code is one-use, including simultaneous challenges',async()=>{
      const user=users.admin;const a=new Client(),b=new Client()
      for(const client of [a,b])assert.equal((await client.request('/api/auth/sign-in/email',{email:user.email,password:user.password})).status,200)
      const results=await Promise.all([a,b].map(client=>client.request('/api/auth/two-factor/verify-backup-code',{code:user.codes[0]})))
      assert.equal(results.filter(r=>r.ok).length,1)
      const reuse=new Client();assert.equal((await reuse.request('/api/auth/sign-in/email',{email:user.email,password:user.password})).status,200)
      assert.equal((await reuse.request('/api/auth/two-factor/verify-backup-code',{code:user.codes[0]})).ok,false)
      assert.equal((await reuse.request('/api/workspace/v1/summary')).status,401)
    })
    await t.test('expired MFA challenges cannot create an assured session',async()=>{
      const user=users.admin;const client=new Client()
      assert.equal((await client.request('/api/auth/sign-in/email',{email:user.email,password:user.password})).status,200)
      await admin.query('UPDATE sentinel_identity.verification SET "expiresAt"=now()-interval \'1 minute\'')
      assert.equal((await client.request('/api/auth/two-factor/verify-totp',{code:totp(user.secret)})).ok,false)
      assert.equal((await client.request('/api/workspace/v1/summary')).status,401)
    })
    await t.test('revoking other sessions and logout invalidate server access',async()=>{
      const a=await signIn('analyst'),b=await signIn('analyst')
      assert.equal((await a.request('/api/auth/revoke-other-sessions',{})).status,200)
      assert.equal((await b.request('/api/workspace/v1/summary')).status,401)
      assert.equal((await a.request('/api/auth/sign-out',{})).status,200)
      assert.equal((await a.request('/api/workspace/v1/summary')).status,401)
    })
    await t.test('idle, absolute and stored expiry fail closed; stale MFA cannot change security',async()=>{
      for(const column of ['lastActiveAt','createdAt','expiresAt']){
        const client=await signIn('viewer');const interval=column==='lastActiveAt'?'31 minutes':'9 hours'
        await admin.query(`UPDATE sentinel_identity.session SET "${column}"=now()-interval '${interval}' WHERE "userId"=$1`,[users.viewer.id])
        assert.equal((await client.request('/api/workspace/v1/summary')).status,401)
      }
      const client=await signIn('viewer');await admin.query('UPDATE sentinel_identity.session SET "mfaVerifiedAt"=now()-interval \'6 minutes\' WHERE "userId"=$1',[users.viewer.id])
      assert.equal((await client.request('/api/auth/revoke-other-sessions',{})).status,403)
    })
    await t.test('membership revocation and role downgrade apply to existing cookies',async()=>{
      const client=await signIn('analyst');await admin.query("UPDATE sentinel_identity.memberships SET role='viewer' WHERE user_id=$1",[users.analyst.id])
      assert.equal((await client.request('/api/workspace/v1/cases',{title:'Downgraded'})).status,403)
      await operator('membership',{email:users.analyst.email,role:'viewer',active:false})
      assert.equal((await client.request('/api/workspace/v1/summary')).status,401)
      const revoked=await signIn('analyst');assert.equal((await revoked.request('/api/workspace/v1/summary')).status,403)
      await assert.rejects(operator('membership',{email:users.admin.email,role:'viewer',active:true}))
      assert.equal((await admin.query('SELECT role FROM sentinel_identity.memberships WHERE user_id=$1',[users.admin.id])).rows[0].role,'admin')
    })
    await t.test('unsafe identity roles and grants are rejected at startup',async()=>{
      const config=identityConfig(env)!
      const adminUrl=env.DATABASE_ADMIN_URL
      await assert.rejects(createIdentityService({...config,database:adminUrl}),/runtime privileges/)
      for(const [privilege,table] of [['UPDATE','sentinel_identity.memberships'],['TRUNCATE','sentinel_identity.security_audit'],['SELECT','public.cases']]){
        await admin.query(`GRANT ${privilege} ON ${table} TO sentinel_identity_app`)
        try{await assert.rejects(createIdentityService(config),/runtime privileges/)}finally{await admin.query(`REVOKE ${privilege} ON ${table} FROM sentinel_identity_app`)}
      }
    })
    await t.test('identity runtime cannot alter membership or rewrite audit, or read telemetry',async()=>{
      const config=identityConfig(env)!;const restricted=new Pool(identityPoolOptions(config.database,config.local))
      try{
        assert.ok((await restricted.query('SELECT role FROM sentinel_identity.memberships')).rowCount)
        await restricted.query("INSERT INTO sentinel_identity.security_audit(action,user_id,success) VALUES ('fixture.acl',$1,true)",[users.admin.id])
        for(const sql of ['UPDATE sentinel_identity.memberships SET active=false','UPDATE sentinel_identity.security_audit SET success=false','DELETE FROM sentinel_identity.security_audit','TRUNCATE sentinel_identity.security_audit','SELECT * FROM public.cases'])await assert.rejects(restricted.query(sql))
      }finally{await restricted.end()}
    })
    await t.test('tampered session cookies cannot authenticate',async()=>{
      const client=await signIn('admin')
      for(const [key,value] of client.cookies)if(key.includes('session_token'))client.cookies.set(key,value+'tampered')
      assert.equal((await client.request('/api/workspace/v1/summary')).status,401)
    })
    await t.test('HTTPS auth responses issue secure host-only cookies without forwarded-header trust',async()=>{
      const secure=createGateway({...env,SENTINEL_AUTH_ORIGIN:'https://sentinel.example.test'})
      try {
        // Use an unenrolled newly provisioned account for a session response.
        const password=randomBytes(24).toString('base64url');await operator('provision',{email:'secure@example.test',name:'Secure fixture',password,role:'viewer'})
        const response=await secure.fetch(new Request('https://sentinel.example.test/api/auth/sign-in/email',{method:'POST',headers:{origin:'https://sentinel.example.test','content-type':'application/json','x-forwarded-for':'203.0.113.77'},body:JSON.stringify({email:'secure@example.test',password})}))
        assert.equal(response.status,200);const cookies=response.headers.getSetCookie();assert.ok(cookies.some(c=>c.includes('session_token=')&&/; Secure/i.test(c)&&/; HttpOnly/i.test(c)&&! /; Domain=/i.test(c)))
        assert.equal((await admin.query('SELECT "ipAddress" FROM sentinel_identity.session s JOIN sentinel_identity."user" u ON u.id=s."userId" WHERE u.email=$1',['secure@example.test'])).rows[0].ipAddress,'')
      } finally{await secure.close()}
    })
    await t.test('password changes and offline MFA recovery revoke sessions',async()=>{
      const a=await signIn('viewer'),b=await signIn('viewer');const user=users.viewer
      const next=randomBytes(24).toString('base64url')
      assert.equal((await a.request('/api/auth/change-password',{currentPassword:user.password,newPassword:next,revokeOtherSessions:false})).status,200)
      assert.equal((await b.request('/api/workspace/v1/summary')).status,401)
      await resetBudgets();assert.equal((await new Client().request('/api/auth/sign-in/email',{email:user.email,password:user.password})).ok,false)
      user.password=next;const recovered=await signIn('viewer')
      await operator('reset-password',{email:user.email,password:next,resetMfa:true})
      assert.equal((await recovered.request('/api/workspace/v1/summary')).status,401)
      assert.equal((await admin.query('SELECT "twoFactorEnabled" FROM sentinel_identity."user" WHERE id=$1',[user.id])).rows[0].twoFactorEnabled,false)
      await resetBudgets();const fresh=new Client();assert.equal((await fresh.request('/api/auth/sign-in/email',{email:user.email,password:next})).status,200)
      assert.equal((await fresh.request('/api/workspace/v1/summary')).status,403)
    })
    await t.test('membership in a different workspace cannot unlock this installation',async()=>{
      const client=await signIn('admin');const other=randomUUID()
      await admin.query('INSERT INTO public.workspaces(id,name) VALUES ($1,$2)',[other,'Foreign identity scope'])
      await admin.query("INSERT INTO sentinel_identity.memberships(user_id,workspace_id,role) VALUES ($1,$2,'admin')",[users.admin.id,other])
      await admin.query('UPDATE sentinel_identity.memberships SET active=false WHERE user_id=$1 AND workspace_id=$2',[users.admin.id,fixture.workspaceId])
      try{assert.equal((await client.request('/api/workspace/v1/summary')).status,403)}finally{await admin.query('UPDATE sentinel_identity.memberships SET active=true WHERE user_id=$1 AND workspace_id=$2',[users.admin.id,fixture.workspaceId])}
    })
    await t.test('shared auth budget rejects exhausted routes and security audit retains attribution',async()=>{
      const bucket=createHash('sha256').update('/sign-in/email').digest('hex')
      await admin.query("INSERT INTO sentinel_identity.request_budget(bucket,started_at,attempts) VALUES ($1,date_trunc('minute',now()),30)",[bucket])
      const response=await new Client().request('/api/auth/sign-in/email',{email:users.admin.email,password:users.admin.password})
      assert.equal(response.status,429);assert.equal((await response.json()).error.code,'RATE_LIMITED')
      const entries=(await admin.query('SELECT action,user_id,success FROM sentinel_identity.security_audit')).rows
      assert.ok(entries.some(r=>r.action==='mfa.verified'&&r.user_id===users.admin.id&&r.success))
      assert.ok(entries.some(r=>r.action==='workspace.denied'&&r.user_id===users.viewer.id&&!r.success))
      assert.ok(entries.some(r=>r.action==='operator.reset-password'&&r.user_id===users.viewer.id&&r.success))
    })
    if(process.env.SENTINEL_BROWSER_AUDIT==='true')await t.test('standalone account browser workflow and readable mobile viewport',async()=>{
      const password=randomBytes(24).toString('base64url');const email='browser@example.test';await operator('provision',{email,name:'Browser fixture',password,role:'viewer'})
      const input=join(fixture.temp,'browser.json');await writeFile(input,JSON.stringify({email,password}),{mode:0o600})
      const runtime={...env} as Record<string,string|undefined>;delete runtime.DATABASE_ADMIN_URL;delete runtime.SENTINEL_APP_PASSWORD;delete runtime.SENTINEL_AUTH_RUNTIME_PASSWORD;delete runtime.DATABASE_ADMIN_ALLOW_LOCAL_INSECURE
      const child=spawn(process.execPath,['build/server/node.js'],{env:{...runtime,SENTINEL_PORT:new URL(origin).port},stdio:'ignore'})
      try {
        let ready=false;for(let i=0;i<50;i++){try{ready=(await fetch(origin+'/api/v1/health')).ok}catch{}if(ready)break;await new Promise(r=>setTimeout(r,100))}assert.ok(ready,'standalone server must start')
        const result=await execFile(process.env.SENTINEL_TEST_PYTHON??'python3',['scripts/identity_browser_audit.py'],{env:{...process.env,VEYCORD_AUDIT_URL:origin,SENTINEL_IDENTITY_FIXTURE:input},timeout:45000});assert.match(result.stdout,/"passed": true/)
      } finally{child.kill('SIGTERM');await new Promise<void>(resolve=>{if(child.exitCode!==null)resolve();else child.once('exit',()=>resolve())})}
    })
  } finally{await gateway.close();await fixture.close()}
})
