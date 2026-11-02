import assert from 'node:assert/strict'
import test from 'node:test'
import { createCollectorApi, type CollectorStore } from '../server/collector-api.js'
import { newCollectorToken, collectorTokenHash, CollectorDeniedError } from '../server/collector-contract.js'

const event = { eventId:'test-1',timestamp:'2026-11-02T10:00:00Z',source:'linux-auth',host:'lab-01',event:'Synthetic login',severity:'low' }
function fixture(overrides: Partial<CollectorStore> = {}) {
  let ingested = 0
  const app = createCollectorApi({
    authorizeCollector:async()=>({allowed:true,source:'linux-auth',id:'synthetic-id'}),
    ingestFromCollector:async()=>{ingested++;return {accepted:1,duplicates:0,findings:0}},
    ...overrides,
  })
  const token = newCollectorToken()
  const send = (path='/events', init: RequestInit = {}) => app.request(`http://localhost/api/collector/v1${path}`, {
    method:'POST',body:JSON.stringify({events:[event]}),...init,
    headers:{authorization:`Bearer ${token}`,'content-type':'application/json',...init.headers},
  })
  return {app,send,token,ingested:()=>ingested}
}

test('collector accepts canonical JSON only, returns no-store metadata and does not expose a read API',async()=>{
  const f=fixture()
  assert.equal((await f.send()).status,202)
  for(const path of ['/summary','/cases','/events/1','/%65vents','/events/']) assert.equal((await f.send(path)).status,404)
  for(const method of ['GET','HEAD','PUT','DELETE']) {
    const r=await f.send('/events',{method,body:undefined})
    assert.equal(r.status,405);assert.equal(r.headers.get('allow'),'POST')
  }
  const r=await f.send();assert.equal(r.headers.get('cache-control'),'no-store');assert.equal(r.headers.get('x-content-type-options'),'nosniff')
  assert.equal(f.ingested(),2)
})

test('collector rejects operator/session/query credentials, malformed bodies and compressed payloads',async()=>{
  const f=fixture()
  for(const headers of [{authorization:''},{authorization:'Bearer '+'a'.repeat(48)},{authorization:`Bearer ${newCollectorToken()}, Bearer bad`}]) assert.equal((await f.send('/events',{headers})).status,401)
  for(const headers of [{origin:'http://localhost'},{cookie:'session=synthetic'}] as Record<string,string>[]) assert.equal((await f.send('/events',{headers})).status,400)
  assert.equal((await f.send('/events?token=synthetic')).status,400)
  for(const body of ['not json',JSON.stringify({events:[]}),JSON.stringify({events:[event],workspaceId:'other'}),JSON.stringify({events:Array(101).fill(event)})]) assert.equal((await f.send('/events',{body})).status,400)
  assert.equal((await f.send('/events',{headers:{'content-type':'text/plain'}})).status,400)
  assert.equal((await f.send('/events',{headers:{'content-length':'invalid'}})).status,400)
  assert.equal((await f.send('/events',{headers:{'content-encoding':'gzip'}})).status,413)
  assert.equal((await f.send('/events',{body:'x'.repeat(262145)})).status,413)
  assert.equal((await f.send('/events',{body:'x'.repeat(262145),headers:{'content-length':'1'}})).status,413)
  assert.equal((await f.send('/events',{headers:{'content-length':'1'}})).status,400)
  assert.equal(f.ingested(),0)
})

test('collector fails closed on absent/revoked credentials, quota and database errors without reflecting secrets',async()=>{
  assert.equal((await fixture({authorizeCollector:async()=>null}).send()).status,401)
  assert.equal((await fixture({ingestFromCollector:async()=>{throw new CollectorDeniedError()}}).send()).status,401)
  const limited=await fixture({authorizeCollector:async()=>({allowed:false,retryAfterSeconds:42})}).send()
  assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'42')
  const f=fixture({authorizeCollector:async()=>{throw new Error('private database password')}})
  const r=await f.send();assert.equal(r.status,503);assert.ok(!(await r.text()).includes('password'))
  assert.notEqual(collectorTokenHash(f.token),f.token)
})

test('collector concurrency is bounded and capacity is released when requests fail',async()=>{
  let release!:()=>void
  const pending=new Promise<void>(r=>{release=r})
  const f=fixture({authorizeCollector:async()=>{await pending;return null}})
  const requests=Array.from({length:8},()=>f.send())
  const busy=await f.send();assert.equal(busy.status,503);assert.equal(busy.headers.get('retry-after'),'1')
  release();assert.ok((await Promise.all(requests)).every(r=>r.status===401))
  assert.equal((await f.send()).status,401)
})
