import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { createGateway } from './gateway.js'
import { assertRuntimeEnvironment } from './runtime-environment.js'

async function main() {
  assertRuntimeEnvironment(process.env)
  const gateway = createGateway()
  const hostname = process.env.SENTINEL_HOST ?? '127.0.0.1'
  const port = Number(process.env.SENTINEL_PORT ?? '8787')
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Server port is invalid')
  if (!['127.0.0.1','::1','localhost'].includes(hostname) && process.env.SENTINEL_ALLOW_NETWORK_BIND !== 'true') throw new Error('Network binding requires explicit configuration')
  const app = new Hono()
  app.use('*',async(c,next)=>{await next();c.header('X-Content-Type-Options','nosniff');c.header('Referrer-Policy','no-referrer');c.header('X-Frame-Options','DENY');c.header('Permissions-Policy','camera=(), microphone=(), geolocation=(), payment=()');c.header('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")})
  app.all('/api',c=>gateway.fetch(c.req.raw))
  app.all('/api/*',c=>gateway.fetch(c.req.raw))
  app.use('*',serveStatic({root:'./dist'}))
  app.get('*',serveStatic({path:'./dist/index.html'}))
  app.onError((_error,c)=>c.json({error:{code:'INTERNAL_ERROR',message:'The request could not be completed'}},500))
  const server = serve({fetch:app.fetch,hostname,port},()=>{process.stdout.write(`Veycord Sentinel is listening on http://${hostname}:${port}\n`)})
  let stopping = false
  const stop = () => {
    if(stopping)return
    stopping=true
    server.close(()=>{void gateway.close().finally(()=>process.exit(0))})
  }
  process.once('SIGINT',stop)
  process.once('SIGTERM',stop)
}
void main().catch(()=>{process.stderr.write('Server configuration or startup failed. Check server-only configuration; credentials are never printed.\n');process.exitCode=1})
