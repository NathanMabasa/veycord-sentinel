import type { BudgetConsumer } from './workspace-budget.js'
import publicApp from './app.js'
import { createPrivateApi } from './private-api.js'
import { identityConfig } from './identity/config.js'
import { identityError, createIdentityService } from './identity/service.js'
import { PostgresStore } from './storage/postgres-store.js'

export type ServerEnvironment = Record<string,string | undefined>
export function createGateway(env: ServerEnvironment = process.env) {
  const identity = identityConfig(env)
  if (identity && env.SENTINEL_PRIVATE_ENABLED !== 'true') throw new Error('Identity requires the private workspace')
  let identityService: Promise<Awaited<ReturnType<typeof createIdentityService>>> | undefined
  const getIdentity = () => {
    if (!identity) throw new Error('Identity is disabled')
    if (!identityService) identityService = createIdentityService(identity).catch(error => { identityService = undefined; throw error })
    return identityService
  }
  let workspaceApp: ReturnType<typeof createPrivateApi> | undefined
  let store: PostgresStore | undefined
  let privateApp: ReturnType<typeof createPrivateApi> | undefined
  if (env.SENTINEL_PRIVATE_ENABLED && !['true','false'].includes(env.SENTINEL_PRIVATE_ENABLED)) throw new Error('Private workspace configuration is invalid')
  if (env.SENTINEL_PRIVATE_ENABLED === 'true') {
    const connectionString = env.DATABASE_URL
    const workspaceId = env.SENTINEL_WORKSPACE_ID
    const token = env.SENTINEL_API_TOKEN
    if (!connectionString || !workspaceId || !token || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(workspaceId) || !/^[A-Za-z0-9_-]{43,128}$/.test(token)) throw new Error('Private workspace configuration is incomplete')
    store = new PostgresStore({connectionString,workspaceId,allowLocalInsecure:env.SENTINEL_ALLOW_LOCAL_DATABASE === 'true'})
    privateApp = createPrivateApi({store,token})
    const dataStore = store
    if (identity) workspaceApp = createPrivateApi({store,token,prefix:'/api/workspace/v1',authenticate:async(c,next)=>{
      try {
        const authorization = await (await getIdentity()).authorize(c.req.raw)
        if (authorization.response) return authorization.response
        c.set('workspaceBudget', authorization.consumeBudget)
        await dataStore.runAsActor(authorization.userId, async()=>{await next()})
      } catch { return identityError(503,'WORKSPACE_UNAVAILABLE','The private workspace is temporarily unavailable') }
    },consumeBudget:async(kind,c)=>{
      const consume=c.get('workspaceBudget') as BudgetConsumer | undefined
      if(!consume)throw new Error('Verified workspace budget missing')
      return consume(kind)
    }})
  }
  return {
    async fetch(request: Request): Promise<Response> {
      const path = new URL(request.url).pathname
      if (path === '/api/session/v1' || path === '/api/auth' || path.startsWith('/api/auth/')) {
        if (!identity) return identityError(503,'AUTH_DISABLED','Account sign-in is not configured on this installation')
        try { return await (await getIdentity()).handle(request) } catch { return identityError(503,'AUTH_UNAVAILABLE','Authentication is temporarily unavailable') }
      }
      if (path === '/api/workspace/v1' || path.startsWith('/api/workspace/v1/')) {
        if (!workspaceApp) return identityError(503,'AUTH_DISABLED','Account sign-in is not configured on this installation')
        return workspaceApp.fetch(request)
      }
      if (path === '/api/private/v1' || path.startsWith('/api/private/v1/')) {
        if (!privateApp) return Response.json({error:{code:'PRIVATE_UNAVAILABLE',message:'Private workspace is not configured on this server.'}},{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
        return privateApp.fetch(request)
      }
      return publicApp.fetch(request)
    },
    async close() { await store?.close(); if(identityService) await (await identityService).close() },
  }
}
