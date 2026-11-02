import { randomUUID } from 'node:crypto'
import { readOperatorInput } from '../db/identity/private-input.js'
import { COLLECTOR_SOURCE_PATTERN, COLLECTOR_TOKEN_PATTERN } from '../server/collector-contract.js'

async function main() {
  const path = process.env.SENTINEL_COLLECTOR_CREDENTIAL
  const endpoint = process.env.SENTINEL_COLLECTOR_URL
  if (!path || !endpoint) throw new Error('Set the credential file and collector URL')
  const url = new URL(endpoint)
  const loopback = ['localhost','127.0.0.1','[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) || url.username || url.password || url.search || url.hash || url.pathname !== '/api/collector/v1/events') throw new Error('Use HTTPS or loopback HTTP and the exact collector endpoint')
  const credential = JSON.parse(await readOperatorInput(path)) as { token?: unknown; source?: unknown }
  if (typeof credential.token !== 'string' || !COLLECTOR_TOKEN_PATTERN.test(credential.token) || typeof credential.source !== 'string' || !COLLECTOR_SOURCE_PATTERN.test(credential.source)) throw new Error('Invalid credential file')
  const eventId = randomUUID()
  const response = await fetch(url, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
    headers: { 'content-type':'application/json', authorization:`Bearer ${credential.token}` },
    body: JSON.stringify({ events:[{
      eventId, timestamp:new Date().toISOString(), source:credential.source, host:'synthetic-collector-lab',
      event:'Synthetic authentication failures — connectivity test', severity:'medium',
      attributes:{category:'authentication',failureCount:5,synthetic:true},
    }] }),
  })
  if (response.status !== 202) throw new Error('Collector did not accept the sample')
  const body = await response.json() as {data?:{accepted?:unknown;duplicates?:unknown;findings?:unknown}}
  if (typeof body.data?.accepted !== 'number' || typeof body.data?.duplicates !== 'number' || typeof body.data?.findings !== 'number') throw new Error('Unexpected collector response')
  process.stdout.write(`Synthetic event ${eventId}: accepted=${body.data.accepted}, duplicates=${body.data.duplicates}, findings=${body.data.findings}. Search for this event ID in the private workspace.\n`)
}
main().catch(() => { process.stderr.write('Synthetic collector sample failed. Check the URL, private credential file, expiry and receiver availability. Secret values are never printed.\n'); process.exitCode=1 })
