import type { EventInput } from '../../../server/data-model'

export function connectionOrigin(value: string): { origin: string; error?: never } | { origin?: never; error: string } {
  if (!value || value.length > 200) return { error: 'Enter your private server origin, up to 200 characters.' }
  try {
    const url = new URL(value)
    const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return { error: 'Use an origin only, such as https://sentinel.example.org. Leave out credentials, paths and query parameters.' }
    if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) return { error: 'Use HTTPS for a remote server. HTTP is allowed only for localhost or a loopback address.' }
    return { origin: url.origin }
  } catch {
    return { error: 'Enter a complete origin, such as http://127.0.0.1:8787 or https://sentinel.example.org.' }
  }
}

function shellQuote(value: string): string {
  return "'" + value.replaceAll("'", "'\\''") + "'"
}

export function connectionCommand(origin: string, kind: 'health' | 'ingest'): string {
  const valid = connectionOrigin(origin)
  if (valid.origin === undefined) throw new Error('Invalid connection origin')
  const path = kind === 'health' ? 'health' : 'events'
  const upload = kind === 'ingest' ? " \\\n      --header 'Content-Type: application/json' \\\n      --data-binary @sentinel-connection-check.json" : ''
  return `# Run in Bash on your private machine. The key stays in this subshell.\n(\n  SENTINEL_URL=${shellQuote(valid.origin)}\n  read -r -s -p 'Private operator key: ' SENTINEL_API_TOKEN || exit 1\n  printf '\\n'\n  printf 'Authorization: Bearer %s\\n' "$SENTINEL_API_TOKEN" |\n    curl --fail --silent --show-error --header @-${upload} \\\n      "$SENTINEL_URL/api/private/v1/${path}"\n)`
}

export function connectionCheckBatch(timestamp = new Date().toISOString()): { events: EventInput[] } {
  return { events: [{
    eventId: 'sentinel-connection-check-v1', timestamp, event: 'Synthetic connection check',
    source: 'HTTP connection check', host: 'example-host', severity: 'low', outcome: 'Success',
    attributes: { synthetic: true, purpose: 'connection-check' },
  }] }
}
