import { randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { execFile as execCallback } from 'node:child_process'
import { createServer } from 'node:net'
import { Pool } from 'pg'
const execFile=promisify(execCallback)
export async function freePort(){
  const server=createServer();await new Promise<void>((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve))
  const address=server.address();if(!address||typeof address==='string')throw new Error('Test port unavailable')
  await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));return address.port
}
export async function identityFixture(){
  const temp=await mkdtemp(join(tmpdir(),'sentinel-identity-'));const data=join(temp,'postgres');let started=false
  const port=await freePort();const adminPassword=randomBytes(36).toString('base64url');const telemetryPassword=randomBytes(36).toString('base64url');const identityPassword=randomBytes(36).toString('base64url')
  const url=(user:string,password:string)=>`postgresql://${user}:${password}@127.0.0.1:${port}/postgres?sslmode=disable`
  const adminUrl=url('postgres',adminPassword);const workspaceId=randomUUID();let admin:Pool|undefined
  async function close(){await admin?.end();if(started)await execFile('pg_ctl',['-D',data,'-m','immediate','-w','stop']).catch(()=>{});await rm(temp,{recursive:true,force:true})}
  try {
    const pwfile=join(temp,'password');await writeFile(pwfile,adminPassword,{mode:0o600})
    await execFile('initdb',['--username=postgres','--auth-host=scram-sha-256','--auth-local=scram-sha-256',`--pwfile=${pwfile}`,data])
    await execFile('pg_ctl',['-D',data,'-l',join(temp,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -c unix_socket_directories=''`,'-w','start']);started=true
    admin=new Pool({connectionString:adminUrl,ssl:false,max:2})
    const env={PATH:process.env.PATH,DATABASE_ADMIN_URL:adminUrl,DATABASE_ADMIN_ALLOW_LOCAL_INSECURE:'true',SENTINEL_APP_PASSWORD:telemetryPassword,DATABASE_URL:url('sentinel_app',telemetryPassword),SENTINEL_ALLOW_LOCAL_DATABASE:'true',SENTINEL_PRIVATE_ENABLED:'true',SENTINEL_WORKSPACE_ID:workspaceId,SENTINEL_API_TOKEN:randomBytes(36).toString('base64url'),SENTINEL_AUTH_ENABLED:'true',SENTINEL_AUTH_ORIGIN:`http://127.0.0.1:${await freePort()}`,SENTINEL_AUTH_ALLOW_LOCAL:'true',SENTINEL_AUTH_SECRET:randomBytes(36).toString('base64url'),SENTINEL_AUTH_RUNTIME_PASSWORD:identityPassword,SENTINEL_AUTH_DATABASE_URL:url('sentinel_identity_app',identityPassword)}
    async function cli(script:string,args:string[]=[],extra:Record<string,string>={}){return execFile(process.execPath,['--import','tsx',script,...args],{env:{...env,...extra},timeout:30000})}
    await cli('db/bootstrap-runtime-role.ts');await cli('db/migrate.ts')
    await admin.query('INSERT INTO public.workspaces(id,name) VALUES ($1,$2)',[workspaceId,'Disposable identity regression'])
    await cli('db/seed-synthetic.ts');await cli('db/identity/setup.ts')
    const input=join(temp,'operator.json')
    async function operator(action:string,body:Record<string,unknown>){await writeFile(input,JSON.stringify(body),{mode:0o600});return cli('db/identity/operator.ts',[action],{SENTINEL_BOOTSTRAP_FILE:input})}
    return {temp,admin,env,workspaceId,operator,close}
  }catch{await close();throw new Error('Disposable identity fixture setup failed; secret diagnostics suppressed')}
}
