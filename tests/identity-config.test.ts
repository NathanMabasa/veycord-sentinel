import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile, chmod, symlink, link, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { identityConfig, identityPoolOptions } from '../server/identity/config.js'
import { PostgresStore } from '../server/storage/postgres-store.js'
import { createAdminPool } from '../db/admin-connection.js'
import { readOperatorInput } from '../db/identity/private-input.js'

const env = { SENTINEL_AUTH_ENABLED:'true', SENTINEL_AUTH_ORIGIN:'https://sentinel.example.test', SENTINEL_AUTH_SECRET:'a'.repeat(48), SENTINEL_AUTH_DATABASE_URL:'postgresql://identity:fixture@db.example.test/app?sslmode=verify-full', SENTINEL_WORKSPACE_ID:'00000000-0000-4000-8000-000000000001' }
test('identity configuration fails closed for malformed origins, workspace identifiers and secrets',()=>{
  assert.equal(identityConfig({}),null)
  assert.equal(identityConfig({...env,SENTINEL_AUTH_ENABLED:'false'}),null)
  assert.equal(identityConfig(env)?.origin,env.SENTINEL_AUTH_ORIGIN)
  for(const value of ['https://sentinel.example.test/path','https://user@sentinel.example.test','https://sentinel.example.test?x=1','http://sentinel.example.test']) assert.throws(()=>identityConfig({...env,SENTINEL_AUTH_ORIGIN:value}))
  for(const value of ['-'.repeat(36),'a'.repeat(36),'not-a-uuid']) assert.throws(()=>identityConfig({...env,SENTINEL_WORKSPACE_ID:value}))
  assert.throws(()=>identityConfig({...env,SENTINEL_API_TOKEN:env.SENTINEL_AUTH_SECRET}))
  assert.throws(()=>identityConfig({...env,SENTINEL_AUTH_ENABLED:'yes'}))
  assert.throws(()=>identityConfig({...env,SENTINEL_AUTH_SECRET:'short'}))
})
test('identity database connections require explicit loopback or verified TLS and fixed search path',()=>{
  for(const query of ['sslmode=require','sslmode=disable','sslmode=verify-full&options=x','sslmode=verify-full&sslrootcert=/tmp/x']) assert.throws(()=>identityPoolOptions(`postgresql://identity:fixture@db.example.test/app?${query}`,true))
  assert.throws(()=>identityPoolOptions('postgresql://identity:fixture@127.0.0.1/app',false))
  const local=identityPoolOptions('postgresql://identity:fixture@127.0.0.1/app',true)
  assert.equal(local.ssl,false)
  assert.equal(local.options,'-c search_path=sentinel_identity')
  assert.deepEqual(identityPoolOptions(env.SENTINEL_AUTH_DATABASE_URL,false).ssl,{rejectUnauthorized:true})
})
test('operator input rejects world-readable, oversized and linked files using the opened descriptor',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'sentinel-input-'))
  try {
    const file=join(dir,'input.json');await writeFile(file,'{"synthetic":true}',{mode:0o600})
    assert.equal(await readOperatorInput(file),'{"synthetic":true}')
    await chmod(file,0o644);await assert.rejects(readOperatorInput(file));await chmod(file,0o600)
    await symlink(file,join(dir,'symlink'));await assert.rejects(readOperatorInput(join(dir,'symlink')))
    await link(file,join(dir,'hardlink'));await assert.rejects(readOperatorInput(file));await rm(join(dir,'hardlink'))
    await writeFile(file,'x'.repeat(4097));await assert.rejects(readOperatorInput(file))
    await assert.rejects(readOperatorInput(dir))
  } finally {await rm(dir,{recursive:true,force:true})}
})

test('connection-string overrides cannot redirect loopback or weaken TLS in any database role',()=>{
  const variants=['ssl=no-verify','ssl=0','host=remote.example.test','port=6543','user=postgres','password=other','max=999','uselibpqcompat=true','sslmode=disable','options=-c%20search_path=public']
  for(const extra of variants){
    const url=`postgresql://identity:fixture@127.0.0.1/app?sslmode=disable&${extra}`
    assert.throws(()=>identityPoolOptions(url,true))
    assert.throws(()=>new PostgresStore({connectionString:url,workspaceId:env.SENTINEL_WORKSPACE_ID,allowLocalInsecure:true}))
    if(!extra.startsWith('options='))assert.throws(()=>createAdminPool(url,true))
  }
})
