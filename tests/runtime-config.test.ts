import assert from 'node:assert/strict'
import test from 'node:test'
import { assertRuntimeEnvironment } from '../server/runtime-environment.js'

test('dedicated runtime rejects migration, restore and encryption credentials',()=>{
  assert.doesNotThrow(()=>assertRuntimeEnvironment({DATABASE_URL:'fixture-runtime-url',SENTINEL_PRIVATE_ENABLED:'false'}))
  for(const field of ['DATABASE_ADMIN_URL','SENTINEL_APP_PASSWORD','POSTGRES_PASSWORD','RESTORE_DATABASE_ADMIN_URL','SENTINEL_BACKUP_KEY']) assert.throws(()=>assertRuntimeEnvironment({[field]:'synthetic-admin-fixture'}),/Administrative configuration/)
})

test('runtime file contains only allowed settings and never overwrites an existing file',async()=>{
  const {mkdtemp,readFile,stat,rm}=await import('node:fs/promises')
  const {tmpdir}=await import('node:os')
  const {join,resolve}=await import('node:path')
  const {promisify}=await import('node:util')
  const {execFile}=await import('node:child_process')
  const execute=promisify(execFile)
  const directory=await mkdtemp(join(tmpdir(),'sentinel-runtime-test-'))
  const script=resolve('scripts/create-runtime-env.mjs')
  const env={...process.env,SENTINEL_PRIVATE_ENABLED:'true',DATABASE_URL:'postgresql://sentinel_app:fixture@localhost/test?sslmode=disable',SENTINEL_WORKSPACE_ID:'00000000-0000-4000-8000-000000000001',SENTINEL_API_TOKEN:'A'.repeat(48),DATABASE_ADMIN_URL:'synthetic-administrator-secret',SENTINEL_BACKUP_KEY:'synthetic-encryption-secret'}
  try {
    await execute(process.execPath,[script],{cwd:directory,env})
    const file=join(directory,'.env.runtime')
    const content=await readFile(file,'utf8')
    assert.equal((await stat(file)).mode&0o777,0o600)
    assert.ok(content.includes('DATABASE_URL='))
    assert.ok(!content.includes('synthetic-administrator-secret'))
    assert.ok(!content.includes('synthetic-encryption-secret'))
    await assert.rejects(execute(process.execPath,[script],{cwd:directory,env}))
    assert.equal(await readFile(file,'utf8'),content)
  } finally {await rm(directory,{recursive:true,force:true})}
})
