import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { getRequestListener } from '@hono/node-server'
import { createGateway } from './server/gateway'

function apiMiddleware(env: Record<string,string|undefined>): Plugin {
  const gateway = createGateway(env)
  const listener = getRequestListener(gateway.fetch)
  const isApi = (url:string|undefined) => {const path=new URL(url??'/','http://localhost').pathname;return path==='/api'||path.startsWith('/api/')}
  return {
    name:'veycord-hono-api',
    configureServer(server) {
      server.middlewares.use((request,response,next)=>{if(isApi(request.url)){void listener(request,response);return}next()})
      server.httpServer?.once('close',()=>{void gateway.close().catch(()=>{})})
    },
    configurePreviewServer(server) {
      server.middlewares.use((request,response,next)=>{if(isApi(request.url)){void listener(request,response);return}next()})
      server.httpServer.once('close',()=>{void gateway.close().catch(()=>{})})
    },
  }
}
export default defineConfig(({mode})=>({plugins:[react(),apiMiddleware({...loadEnv(mode,process.cwd(),''),...process.env})]}))
