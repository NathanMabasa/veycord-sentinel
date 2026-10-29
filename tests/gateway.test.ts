import assert from 'node:assert/strict'
import test from 'node:test'
import { createGateway } from '../server/gateway.js'

test('private routes fail closed by default while public fixtures remain separate',async()=>{
  const gateway=createGateway({})
  assert.equal((await gateway.fetch(new Request('http://localhost/api/private/v1/summary'))).status,503)
  assert.equal((await gateway.fetch(new Request('http://localhost/api/v1/health'))).status,200)
  for(const path of ['/api/session/v1','/api/auth/sign-in/email','/api/workspace/v1/summary']){
    const response=await gateway.fetch(new Request('http://localhost'+path));assert.equal(response.status,503)
    assert.equal((await response.json()).error.code,'AUTH_DISABLED')
  }
  await gateway.close()
})
test('enabling private mode requires complete server-only configuration and verified TLS',()=>{
  for(const env of [{SENTINEL_PRIVATE_ENABLED:'yes'},{SENTINEL_PRIVATE_ENABLED:'true'},{SENTINEL_PRIVATE_ENABLED:'true',DATABASE_URL:'postgresql://sentinel_app:fixture@db.example.test/db?sslmode=disable',SENTINEL_WORKSPACE_ID:'00000000-0000-4000-8000-000000000001',SENTINEL_API_TOKEN:'a'.repeat(48)}]) assert.throws(()=>createGateway(env))
})
