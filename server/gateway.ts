import publicApp from './app.js'
import { createPrivateApi } from './private-api.js'
import { PostgresStore } from './storage/postgres-store.js'

export type ServerEnvironment = Record<string,string | undefined>
export function createGateway(env: ServerEnvironment = process.env) {
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
  }
  return {
    async fetch(request: Request): Promise<Response> {
      const path = new URL(request.url).pathname
      if (path === '/api/private/v1' || path.startsWith('/api/private/v1/')) {
        if (!privateApp) return Response.json({error:{code:'PRIVATE_UNAVAILABLE',message:'Private workspace is not configured on this server.'}},{status:503,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}})
        return privateApp.fetch(request)
      }
      return publicApp.fetch(request)
    },
    async close() { await store?.close() },
  }
}
