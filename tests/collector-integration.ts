import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { execFile as execFileCallback } from 'node:child_process'
import type { Pool } from 'pg'
import { serve } from '@hono/node-server'
import { once } from 'node:events'
import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { createGateway } from '../server/gateway.js'
import { collectorTokenHash, newCollectorToken } from '../server/collector-contract.js'
import { PostgresStore } from '../server/storage/postgres-store.js'
import { evaluateEvent } from '../server/detections.js'

const execFile=promisify(execFileCallback)
export async function exerciseCollectorIntegration(admin:Pool,runtimeUrl:string,cliEnv:NodeJS.ProcessEnv,temp:string) {
  const workspace=randomUUID()
  await admin.query('INSERT INTO workspaces (id,name) VALUES ($1,$2)',[workspace,'Synthetic collector workspace'])
  const env={...cliEnv,SENTINEL_WORKSPACE_ID:workspace,SENTINEL_COLLECTOR_FILE:join(temp,'collector-input.json'),SENTINEL_COLLECTOR_OUTPUT:join(temp,'collector-credential.json')}
  await writeFile(env.SENTINEL_COLLECTOR_FILE,JSON.stringify({source:'linux-auth',ttlHours:1}),{mode:0o600})
  const issue=await execFile(process.execPath,['--import','tsx','db/collector-operator.ts','issue'],{env})
  const credential=JSON.parse(await readFile(env.SENTINEL_COLLECTOR_OUTPUT,'utf8')) as {id:string;source:string;token:string}
  assert.ok(!issue.stdout.includes(credential.token));assert.equal((await stat(env.SENTINEL_COLLECTOR_OUTPUT)).mode & 0o777,0o600)
  await assert.rejects(execFile(process.execPath,['--import','tsx','db/collector-operator.ts','issue'],{env}), 'issuing refuses to overwrite the credential file')
  assert.equal((await admin.query('SELECT count(*) FROM collector_credentials WHERE workspace_id=$1',[workspace])).rows[0].count,'1')
  const stored=(await admin.query('SELECT token_hash,source FROM collector_credentials WHERE workspace_id=$1',[workspace])).rows[0]
  assert.equal(stored.token_hash,collectorTokenHash(credential.token));assert.equal(stored.source,'linux-auth')
  const gateway=createGateway({SENTINEL_PRIVATE_ENABLED:'true',SENTINEL_COLLECTOR_ENABLED:'true',DATABASE_URL:runtimeUrl,SENTINEL_ALLOW_LOCAL_DATABASE:'true',SENTINEL_WORKSPACE_ID:workspace,SENTINEL_API_TOKEN:'a'.repeat(48)})
  const second=createGateway({SENTINEL_PRIVATE_ENABLED:'true',SENTINEL_COLLECTOR_ENABLED:'true',DATABASE_URL:runtimeUrl,SENTINEL_ALLOW_LOCAL_DATABASE:'true',SENTINEL_WORKSPACE_ID:cliEnv.SENTINEL_WORKSPACE_ID,SENTINEL_API_TOKEN:'a'.repeat(48)})
  const app=new Hono()
  app.all('/api/*',c=>gateway.fetch(c.req.raw))
  app.use('*',serveStatic({root:'./dist'}))
  app.get('*',serveStatic({path:'./dist/index.html'}))
  const server=serve({fetch:app.fetch,hostname:'127.0.0.1',port:0})
  await once(server,'listening')
  const address=server.address()
  if(!address || typeof address==='string')throw new Error('Collector test listener failed')
  const event={eventId:'collector-event-1',timestamp:new Date().toISOString(),source:'linux-auth',host:'synthetic-host',event:'Synthetic authentication failures',severity:'medium' as const,attributes:{category:'authentication',failureCount:5}}
  const send=(body:unknown={events:[event]},token=credential.token)=>fetch(`http://127.0.0.1:${address.port}/api/collector/v1/events`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body)})
  try {
    const sample=await execFile(process.execPath,['--import','tsx','scripts/collector-sample.ts'],{env:{PATH:process.env.PATH,SENTINEL_COLLECTOR_CREDENTIAL:env.SENTINEL_COLLECTOR_OUTPUT,SENTINEL_COLLECTOR_URL:`http://127.0.0.1:${address.port}/api/collector/v1/events`}})
    assert.match(sample.stdout,/accepted=1, duplicates=0, findings=1/);assert.ok(!sample.stdout.includes(credential.token))
    const first=await send();assert.equal(first.status,202);assert.deepEqual((await first.json()).data,{accepted:1,duplicates:0,findings:1})
    const duplicate=await send();assert.equal(duplicate.status,202);assert.equal((await duplicate.json()).data.duplicates,1)
    const audit=(await admin.query("SELECT actor,resource_id,details FROM audit_entries WHERE workspace_id=$1 AND action='events.ingested'",[workspace])).rows[0]
    assert.equal(audit.actor,'collector');assert.equal(audit.resource_id,credential.id);assert.equal(audit.details.collectorId,credential.id)
    assert.ok(!JSON.stringify(audit).includes(credential.token))
    for(const path of ['/api/private/v1/summary','/api/private/v1/cases']) assert.equal((await gateway.fetch(new Request('http://localhost'+path,{headers:{authorization:`Bearer ${credential.token}`}}))).status,401)
    assert.equal((await send({events:[{...event,eventId:'spoofed',source:'other-source'}]})).status,400)
    assert.equal((await send({events:[event],workspaceId:randomUUID()})).status,400)
    assert.equal((await send(undefined,newCollectorToken())).status,401)
    assert.equal((await second.fetch(new Request('http://localhost/api/collector/v1/events',{method:'POST',headers:{authorization:`Bearer ${credential.token}`,'content-type':'application/json'},body:JSON.stringify({events:[event]})}))).status,401)
    // Runtime cannot issue/change/extend/revoke credentials; only counter columns are writable.
    const {Pool}=await import('pg')
    const runtime=new Pool({connectionString:runtimeUrl.replace('?sslmode=disable',''),ssl:false,max:1})
    try {
      for(const sql of ["UPDATE collector_credentials SET source='other-source'","UPDATE collector_credentials SET expires_at=now()+interval '1 year'","UPDATE collector_credentials SET revoked_at=NULL",'DELETE FROM collector_credentials']) await assert.rejects(runtime.query(sql))
      assert.equal((await runtime.query('SELECT * FROM collector_credentials')).rowCount,0)
    } finally {await runtime.end()}
    const expires=(await admin.query('SELECT expires_at FROM collector_credentials WHERE id=$1',[credential.id])).rows[0].expires_at
    await admin.query("UPDATE collector_credentials SET created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' WHERE id=$1",[credential.id])
    assert.equal((await send()).status,401)
    await admin.query('UPDATE collector_credentials SET expires_at=$2 WHERE id=$1',[credential.id,expires])
    // Avoid racing a legitimate minute rollover: prime only with >5 seconds left in that DB minute.
    const seconds=(await admin.query("SELECT EXTRACT(SECOND FROM clock_timestamp()) AS seconds")).rows[0].seconds
    if(Number(seconds)>54)await new Promise(resolve=>setTimeout(resolve,(61-Number(seconds))*1000))
    await admin.query("UPDATE collector_credentials SET window_start=date_trunc('minute',statement_timestamp()),request_count=9 WHERE id=$1",[credential.id])
    const burst=await Promise.all([send(),send(),send()]);assert.equal(burst.filter(r=>r.status===202).length,1);assert.equal(burst.filter(r=>r.status===429).length,2)
    // The allowance lives in PostgreSQL rather than a request-local counter.
    const repeated=await send();assert.equal(repeated.status,429);assert.ok(Number(repeated.headers.get('retry-after'))>=1)
    const separateGateway=createGateway({SENTINEL_PRIVATE_ENABLED:'true',SENTINEL_COLLECTOR_ENABLED:'true',DATABASE_URL:runtimeUrl,SENTINEL_ALLOW_LOCAL_DATABASE:'true',SENTINEL_WORKSPACE_ID:workspace,SENTINEL_API_TOKEN:'a'.repeat(48)})
    try {assert.equal((await separateGateway.fetch(new Request('http://localhost/api/collector/v1/events',{method:'POST',headers:{authorization:`Bearer ${credential.token}`,'content-type':'application/json'},body:JSON.stringify({events:[event]})}))).status,429)} finally {await separateGateway.close()}
    await admin.query('UPDATE collector_credentials SET request_count=0 WHERE id=$1',[credential.id])
    const raceStore=new PostgresStore({connectionString:runtimeUrl,workspaceId:workspace,allowLocalInsecure:true})
    assert.equal((await raceStore.authorizeCollector(collectorTokenHash(credential.token)))?.allowed,true)
    await writeFile(env.SENTINEL_COLLECTOR_FILE,JSON.stringify({id:credential.id}),{mode:0o600})
    await admin.query('UPDATE workspaces SET max_audit_entries=(SELECT count(*) FROM audit_entries WHERE workspace_id=$1) WHERE id=$1',[workspace])
    await execFile(process.execPath,['--import','tsx','db/collector-operator.ts','revoke'],{env})
    await execFile(process.execPath,['--import','tsx','db/collector-operator.ts','revoke'],{env})
    assert.equal((await admin.query("SELECT count(*) FROM audit_entries WHERE workspace_id=$1 AND action='collector.revoked'",[workspace])).rows[0].count,'1')
    try {await assert.rejects(raceStore.ingestFromCollector(collectorTokenHash(credential.token),[event],[evaluateEvent(event)]),/Collector credential/)} finally {await raceStore.close()}
    assert.equal((await send()).status,401)
    assert.equal((await admin.query('SELECT count(*) FROM events WHERE workspace_id=$1',[workspace])).rows[0].count,'2')
    if(process.env.SENTINEL_COLLECTOR_BROWSER_AUDIT==='true' || process.env.SENTINEL_BROWSER_AUDIT==='true') {
      const browser=await execFile(process.env.SENTINEL_TEST_PYTHON??'python3',['scripts/collector_browser_audit.py'],{env:{PATH:process.env.PATH,VEYCORD_AUDIT_URL:`http://127.0.0.1:${address.port}`,SENTINEL_AUDIT_TOKEN:'a'.repeat(48)},timeout:30000})
      assert.match(browser.stdout,/"passed": true/)
    }
    process.stdout.write('Collector integration: issue/hash/permissions/ingest/finding/replay/spoofing/expiry/quota/revoke passed.\n')
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));await gateway.close();await second.close()}
}
