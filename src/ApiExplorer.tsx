import { useEffect, useRef, useState } from 'react'
import { Play, Square, ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import './api-explorer.css'

type Endpoint = 'health' | 'events' | 'detections'
export default function ApiExplorer() {
  const [endpoint, setEndpoint] = useState<Endpoint>('events')
  const [query, setQuery] = useState('')
  const [response, setResponse] = useState('Run a request to inspect its JSON response.')
  const [status, setStatus] = useState<string>('Not requested')
  const [loading, setLoading] = useState(false)
  const controller = useRef<AbortController | null>(null)
  const params = new URLSearchParams({ limit: '5' })
  if (query.trim()) params.set('q', query.trim())
  const path = `/api/v1/${endpoint}${endpoint === 'events' ? `?${params}` : ''}`
  useEffect(() => () => { const request = controller.current; controller.current = null; request?.abort() }, [])

  async function runRequest() {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setLoading(true)
    setStatus('Loading…')
    const timeout = window.setTimeout(() => request.abort(), 8000)
    try {
      const result = await fetch(path, { signal: request.signal, headers: { Accept: 'application/json' }, cache: 'no-store' })
      if (!result.headers.get('content-type')?.includes('application/json')) {
        throw new Error('The API is unavailable on this host. Run npm run dev or npm run preview locally to use the synthetic API.')
      }
      const body: unknown = await result.json()
      if (controller.current !== request) return
      setResponse(JSON.stringify(body, null, 2))
      setStatus(`HTTP ${result.status} · ${result.ok ? 'Success' : 'Request rejected'}`)
    } catch (error) {
      if (controller.current !== request) return
      setStatus('Request unavailable')
      setResponse(error instanceof Error && error.name !== 'AbortError' ? error.message : 'Request cancelled or timed out. Try again when the local server is available.')
    } finally {
      window.clearTimeout(timeout)
      if (controller.current === request) setLoading(false)
    }
  }

  return <div className="api-explorer">
    <Link to="/docs" className="api-back"><ArrowLeft size={16} /> Back to documentation</Link>
    <div className="notice-block"><p><b>Synthetic, read-only API</b><br />Available through the local development and preview servers. These endpoints serve bundled fixtures; they do not ingest logs or authenticate users. Static-only hosting requires a separately deployed API.</p></div>
    <form className="api-request-form" onSubmit={event => { event.preventDefault(); void runRequest() }}>
      <label htmlFor="api-endpoint">Endpoint<select id="api-endpoint" value={endpoint} disabled={loading} onChange={event => setEndpoint(event.target.value as Endpoint)}><option value="events">Search sample events</option><option value="detections">List starter detections</option><option value="health">Check demo API status</option></select></label>
      <label htmlFor="api-query">Event search<input id="api-query" value={query} onChange={event => setQuery(event.target.value)} disabled={loading || endpoint !== 'events'} maxLength={120} placeholder="Try PowerShell or FIN-WS-042" /></label>
      <button className="button button-primary" type="submit" disabled={loading}><Play size={16} />{loading ? 'Running…' : 'Run request'}</button>
      {loading && <button className="button button-dark-outline" type="button" onClick={() => controller.current?.abort()}><Square size={15} /> Cancel</button>}
    </form>
    <div className="api-request-path"><b>GET</b><code>{path}</code></div>
    <div className="api-response-title"><h2>Response</h2><span role="status" aria-live="polite">{status}</span></div>
    <pre tabIndex={0} aria-label="API response"><code>{response}</code></pre>
    <details className="api-contract"><summary>Contract and limits</summary><p>Event search supports q, source, severity, from, to, limit, and cursor. The default page contains up to 50 events, with a maximum of 100. Search text is limited to 120 characters, and a paired time range to 31 days. Unknown or repeated parameters are rejected. Responses use no-store and nosniff headers. There are eight fixed events and four detection examples.</p><p>Ingestion, alert mutation, case persistence on a server, identity, and tenant authorization are pending. Your dashboard cases and preferences are kept separately in this browser.</p></details>
  </div>
}
