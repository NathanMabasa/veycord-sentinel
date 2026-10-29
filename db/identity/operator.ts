import { readFile, stat } from 'node:fs/promises'
import { createAdminPool, requiredEnv, localInsecureFromEnv } from '../admin-connection.js'
import { makeIdentity } from '../../server/identity/options.js'
import { identityConfig } from '../../server/identity/config.js'
import { hashPassword } from 'better-auth/crypto'

async function main(){
  const action=process.argv[2]
  if(!['provision','reset-password','membership'].includes(action))throw new Error('Choose an explicit identity operator action')
  const file=requiredEnv('SENTINEL_BOOTSTRAP_FILE'); const info=await stat(file)
  if(!info.isFile() || info.size>4096 || (info.mode&0o077)!==0)throw new Error('Operator input must be a private mode0600 JSON file, at most4KiB')
  const data=JSON.parse(await readFile(file,'utf8')) as {email?:string;password?:string;name?:string;role?:string;resetMfa?:boolean;active?:boolean}
  if ((data.active!==undefined && typeof data.active!=='boolean') || (data.resetMfa!==undefined && typeof data.resetMfa!=='boolean'))throw new Error('Recovery and membership flags must be boolean')
  const email=data.email?.trim().toLowerCase()
  if(!email || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Email is invalid')
  if(action!=='membership' && (!data.password || data.password.length<14 || data.password.length>128))throw new Error('Password must be14–128 characters')
  const config=identityConfig({...process.env,SENTINEL_AUTH_ENABLED:'true'})
  if(!config)throw new Error('Identity configuration is missing')
  const admin=new URL(requiredEnv('DATABASE_ADMIN_URL'));admin.searchParams.set('options','-c search_path=sentinel_identity')
  const pool=createAdminPool(admin.toString(),localInsecureFromEnv('DATABASE_ADMIN_ALLOW_LOCAL_INSECURE'))
  try {
    const client=await pool.connect()
    try {
      await client.query('SELECT pg_advisory_lock(728240037)')
      if(action==='provision'){
        if(!['admin','analyst','viewer'].includes(data.role??'') || !data.name?.trim() || data.name.length>100)throw new Error('Name and supported role are required')
        if(!(await client.query('SELECT 1 FROM sentinel_identity.memberships LIMIT 1')).rowCount && data.role!=='admin')throw new Error('The first provisioned member must be an administrator')
        const auth=makeIdentity(config,pool,true)
        const result=await auth.api.signUpEmail({body:{email,password:data.password!,name:data.name.trim()}})
        await client.query('INSERT INTO sentinel_identity.memberships (user_id,workspace_id,role) VALUES ($1,$2,$3)',[result.user.id,config.workspaceId,data.role])
        await client.query('DELETE FROM sentinel_identity.session WHERE "userId"=$1',[result.user.id])
        await client.query("INSERT INTO sentinel_identity.security_audit(action,user_id,success) VALUES ('operator.provisioned',$1,true)",[result.user.id])
      } else {
        const id=(await client.query<{id:string}>('SELECT id FROM sentinel_identity."user" WHERE email=$1',[email])).rows[0]?.id
        if(!id)throw new Error('User was not found')
        await client.query('BEGIN')
        try {
          if(action==='reset-password'){
            await client.query('UPDATE sentinel_identity.account SET password=$1 WHERE "userId"=$2 AND "providerId"=\'credential\'',[await hashPassword(data.password!),id])
            if(data.resetMfa===true){await client.query('DELETE FROM sentinel_identity."twoFactor" WHERE "userId"=$1',[id]);await client.query('UPDATE sentinel_identity."user" SET "twoFactorEnabled"=false WHERE id=$1',[id])}
          } else {
            if(!['admin','analyst','viewer'].includes(data.role??''))throw new Error('Role is invalid')
            await client.query('UPDATE sentinel_identity.memberships SET role=$1,active=$2 WHERE user_id=$3 AND workspace_id=$4',[data.role,data.active!==false,id,config.workspaceId])
          }
          await client.query('DELETE FROM sentinel_identity.session WHERE "userId"=$1',[id])
          await client.query('INSERT INTO sentinel_identity.security_audit(action,user_id,success) VALUES ($1,$2,true)',[`operator.${action}`,id]);await client.query('COMMIT')
        } catch {await client.query('ROLLBACK');throw new Error('Operator change failed')}
      }
      process.stdout.write('Identity operator action completed. Account holders must sign in and verify MFA.\n')
    } finally {await client.query('SELECT pg_advisory_unlock(728240037)').catch(()=>{});client.release()}
  } finally {await pool.end()}
}
main().catch(()=>{process.stderr.write('Identity action failed. Check the private input, permissions and account state. Secret values are never printed.\n');process.exitCode=1})
