import assert from 'node:assert/strict'
import { constants } from 'node:fs'
import { open, lstat } from 'node:fs/promises'
import test from 'node:test'
import { assertRuntimeEnvironment } from '../server/runtime-environment.js'

const READ_NOFOLLOW = constants.O_RDONLY | constants.O_NOFOLLOW

async function readAt(file: Awaited<ReturnType<typeof open>>, size: number): Promise<string> {
  const contents = Buffer.alloc(size)
  let offset = 0
  while (offset < size) {
    const result = await file.read(contents, offset, size - offset, offset)
    if (result.bytesRead === 0) throw new Error('Runtime test file changed while being read')
    offset += result.bytesRead
  }
  return contents.toString('utf8')
}

test('dedicated runtime rejects migration, restore and encryption credentials',()=>{
  assert.doesNotThrow(()=>assertRuntimeEnvironment({DATABASE_URL:'fixture-runtime-url',SENTINEL_PRIVATE_ENABLED:'false'}))
  for(const field of ['DATABASE_ADMIN_URL','SENTINEL_APP_PASSWORD','POSTGRES_PASSWORD','RESTORE_DATABASE_ADMIN_URL','SENTINEL_BACKUP_KEY']) assert.throws(()=>assertRuntimeEnvironment({[field]:'synthetic-admin-fixture'}),/Administrative configuration/)
})

test('runtime file contains only allowed settings and never overwrites an existing file',async()=>{
  const {mkdtemp,rm}=await import('node:fs/promises')
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
    const handle=await open(file,READ_NOFOLLOW)
    try {
      const content=await handle.readFile('utf8')
      assert.ok(content.includes('DATABASE_URL='))
      assert.ok(!content.includes('synthetic-administrator-secret'))
      assert.ok(!content.includes('synthetic-encryption-secret'))
      await assert.rejects(execute(process.execPath,[script],{cwd:directory,env}))
      // Inspect the directory entry after refusal; this is an assertion, not a check before access.
      const fileStat=await handle.stat()
      const pathStat=await lstat(file)
      assert.ok(pathStat.isFile())
      assert.equal(fileStat.mode&0o777,0o600)
      assert.equal(pathStat.dev,fileStat.dev)
      assert.equal(pathStat.ino,fileStat.ino)
      assert.equal(await readAt(handle,fileStat.size),content)
    } finally { await handle.close() }
  } finally {await rm(directory,{recursive:true,force:true})}
})
