import { serve } from '@hono/node-server'
import worker from '../dist/server/index.js'

serve({ fetch: request => worker.fetch(request), hostname: '127.0.0.1', port: 4173 }, () => {
  console.log('Public Worker preview: http://127.0.0.1:4173')
})
