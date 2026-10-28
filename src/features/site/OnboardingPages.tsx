import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Check, Copy, Download, ExternalLink, Github, Terminal } from 'lucide-react'
import { PageFrame } from './SitePages'
import { appConfig } from '../../config'
import { connectionCheckBatch, connectionCommand, connectionOrigin } from './connection-setup'
import './onboarding.css'

function CommandBlock({ title, value }: { title: string; value: string }) {
  const [status, setStatus] = useState({ value: '', message: '' })
  async function copy() {
    try { await navigator.clipboard.writeText(value); setStatus({ value, message: 'Copied to clipboard.' }) }
    catch { setStatus({ value, message: 'Clipboard unavailable. Select and copy the command below.' }) }
  }
  return <div className="setup-command">
    <div className="setup-command__heading"><h3>{title}</h3><button type="button" onClick={() => void copy()}><Copy size={16} />Copy command</button></div>
    <textarea aria-label={title} readOnly value={value} rows={Math.min(value.split('\n').length + 1, 17)} spellCheck={false} />
    <p className="setup-command__status" role="status">{status.value === value ? status.message : ''}</p>
  </div>
}

export function GetStartedPage() {
  const localCommands = `git clone ${appConfig.githubUrl}.git veycord-sentinel\ncd veycord-sentinel\nnpm ci\nnpm run dev`
  return <PageFrame eyebrow="GET STARTED" title="Choose where Sentinel runs." lead="Explore the web demo, or run the open-source application with a database you control.">
    <div className="onboarding-paths">
      <section className="onboarding-path onboarding-path--demo" aria-labelledby="web-path-title">
        <span className="onboarding-status">Available now</span><h2 id="web-path-title">Try it on the web</h2>
        <p>Practice searching events, reviewing alerts and building a case. No account or installation needed.</p>
        <ul><li><Check size={17} />Synthetic security records</li><li><Check size={17} />Light and dark themes</li><li><Check size={17} />Case changes stay in your browser</li></ul>
        <Link className="button button-primary" to="/demo">Try the web demo <ArrowRight size={17} /></Link>
        <p className="onboarding-note">Hosted accounts and real-log ingestion are still being built.</p>
      </section>
      <section className="onboarding-path" id="self-host" aria-labelledby="self-host-title">
        <span className="onboarding-status">Open-source alpha</span><h2 id="self-host-title">Run it yourself</h2>
        <p>Use the same application with the private Node API and PostgreSQL. Your configuration and records stay on your infrastructure.</p>
        <ul><li><Check size={17} />Apache-2.0 application source</li><li><Check size={17} />Database schema and migrations</li><li><Check size={17} />Private HTTP ingestion and durable cases</li></ul>
        <div className="onboarding-actions"><a className="button button-primary" href={appConfig.sourceZipUrl}><Download size={17} />Download source ZIP</a><a className="button button-dark-outline" href={appConfig.githubUrl} target="_blank" rel="noreferrer"><Github size={17} />View on GitHub</a></div>
        <p className="onboarding-note">Source code, not a packaged installer. Start with synthetic data.</p>
      </section>
    </div>
    <section className="onboarding-install" aria-labelledby="install-title">
      <div><h2 id="install-title">Start locally, then connect a source.</h2><p>Node.js 22+ runs the demo. The private workspace also requires PostgreSQL 16 and separate runtime credentials.</p><ol><li>Clone or download the source.</li><li>Run the sample workspace locally.</li><li>Follow the private database setup.</li><li>Send a synthetic check event to your own API.</li></ol>
        <div className="onboarding-actions"><a href={`${appConfig.githubUrl}/blob/main/docs/PRIVATE-WORKSPACE.md`} target="_blank" rel="noreferrer"><BookOpen size={17} />Private setup guide <ExternalLink size={14} /></a><Link to="/connections">Browse connections <ArrowRight size={16} /></Link></div>
      </div><CommandBlock title="Run the local demo" value={localCommands} />
    </section>
    <aside className="onboarding-boundary"><h2>Before using real security data</h2><p>The private workspace is a single-operator foundation. User accounts, roles, managed collection and additional privacy/operational controls remain open. <Link to="/security">Read the security status</Link> and <Link to="/roadmap">release roadmap</Link> before a real-data deployment.</p></aside>
  </PageFrame>
}

const plannedSources = [
  ['Linux authentication logs', 'Parser planned', 'Normalize authentication fields into the HTTP event contract. No automatic file collector is included.'],
  ['Windows event logs', 'Collector planned', 'An established collector and reviewed event mappings are needed before automatic collection.'],
  ['Firewall and network logs', 'Parser planned', 'Vendor-specific formats and network-flow mappings need representative fixtures and validation.'],
  ['Cloud and GitHub audit logs', 'Connector planned', 'Provider permissions, revocation, pagination and retry behavior need dedicated adapters.'],
]

export function ConnectionsPage() {
  return <PageFrame eyebrow="CONNECTIONS" title="Bring data into your own workspace." lead="Start with the private HTTP API. See exactly what works today and which source adapters are still planned.">
    <section className="connection-primary" aria-labelledby="http-connection-title">
      <div className="connection-primary__icon"><Terminal size={25} /></div><div><span className="onboarding-status">Available for self-hosted labs</span><h2 id="http-connection-title">HTTP JSON API</h2><p>Send bounded, normalized event batches to your private Node/PostgreSQL installation. Authenticate with its operator key, then inspect the stored records.</p><p className="connection-contract">Up to 100 events and 256 KiB per batch. One configured workspace per service.</p></div>
      <Link className="button button-primary" to="/connections/http">Set up HTTP ingestion <ArrowRight size={17} /></Link>
    </section>
    <section className="connection-roadmap" aria-labelledby="source-roadmap-title"><h2 id="source-roadmap-title">Source adapters</h2><p>These are planned collection paths. The public demo does not connect to live accounts or devices.</p>
      <ul>{plannedSources.map(([name, status, description]) => <li key={name}><div><h3>{name}</h3><p>{description}</p></div><span className="onboarding-status">{status}</span></li>)}</ul>
    </section>
    <div className="onboarding-actions"><Link to="/get-started#self-host"><Download size={17} />Download and self-host</Link><a href={`${appConfig.githubUrl}/blob/main/docs/PRIVATE-API.md`} target="_blank" rel="noreferrer">Read the private API contract <ExternalLink size={14} /></a><Link to="/demo?view=sources">Inspect the demo sources <ArrowRight size={16} /></Link></div>
  </PageFrame>
}

export function HttpSetupPage() {
  const [input, setInput] = useState('http://127.0.0.1:8787')
  const [origin, setOrigin] = useState('http://127.0.0.1:8787')
  const [error, setError] = useState('')
  const [status, setStatus] = useState('Commands use http://127.0.0.1:8787.')
  function configure(event: FormEvent) {
    event.preventDefault()
    const result = connectionOrigin(input.trim())
    if (result.origin === undefined) { setError(result.error); return }
    setOrigin(result.origin); setError(''); setStatus(`Commands updated for ${result.origin}.`)
  }
  function downloadSample() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(connectionCheckBatch(), null, 2) + '\n'], { type: 'application/json' }))
    const link = document.createElement('a'); link.href = url; link.download = 'sentinel-connection-check.json'; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  return <PageFrame eyebrow="HTTP CONNECTION" title="Check your private ingestion path." lead="Generate setup commands and a synthetic check event. Run them in your own terminal; keep the operator key on your private machine.">
    <div className="connection-setup">
      <aside className="connection-setup__requirements"><h2>Before you start</h2><ul><li>A configured Node/PostgreSQL workspace</li><li>Your private operator key</li><li>Bash and curl on your machine</li></ul><a href={`${appConfig.githubUrl}/blob/main/docs/PRIVATE-WORKSPACE.md`} target="_blank" rel="noreferrer">Follow the private setup guide <ExternalLink size={14} /></a><p>This guide generates commands. Connection results come from your own server, not this public website.</p></aside>
      <div className="connection-setup__steps">
        <section aria-labelledby="origin-title"><h2 id="origin-title">1. Choose your server</h2><p>Use a private HTTPS origin, or loopback HTTP for a local synthetic lab.</p>
          <form onSubmit={configure} noValidate><label htmlFor="connection-origin">Sentinel server origin</label><div className="connection-origin-row"><input id="connection-origin" type="url" maxLength={200} value={input} onChange={event => setInput(event.target.value)} aria-describedby={error ? 'connection-origin-help connection-origin-error' : 'connection-origin-help'} aria-invalid={Boolean(error)} autoComplete="off" spellCheck={false} /><button className="button button-dark-outline" type="submit">Update commands</button></div><p id="connection-origin-help">Example: https://sentinel.example.org. Enter only the origin, without a key or API path.</p>{error && <p id="connection-origin-error" className="connection-error" role="alert">{error}</p>}<p className="connection-origin-status" role="status">{status}</p></form>
        </section>
        <section aria-labelledby="health-title"><h2 id="health-title">2. Check authenticated access</h2><p>Paste the private operator key when Bash prompts. The command keeps it out of the command arguments and shell history.</p><CommandBlock title="Check private API health" value={connectionCommand(origin, 'health')} /><p>A healthy configured store returns <code>{'{"data":{"status":"ok"}}'}</code>. A 401 means the operator key was not accepted.</p></section>
        <section aria-labelledby="check-event-title"><h2 id="check-event-title">3. Send one synthetic event</h2><p>Save the check file in the terminal's working directory. Its fixed event ID makes repeated submissions duplicate-safe.</p><button className="button button-dark-outline" type="button" onClick={downloadSample}><Download size={17} />Download check JSON</button><CommandBlock title="Send the synthetic check event" value={connectionCommand(origin, 'ingest')} /></section>
        <section aria-labelledby="verify-event-title"><h2 id="verify-event-title">4. Inspect the stored record</h2><p>Open <code>{origin}/workspace</code> in your private environment and search for <strong>Synthetic connection check</strong>. Verify its source and timestamp before mapping another event format.</p><p>The public demo remains separate. Remote access and real telemetry require the documented security and operational gates.</p><div className="onboarding-actions"><Link to="/connections">All connection paths</Link><a href={`${appConfig.githubUrl}/blob/main/docs/PRIVATE-API.md`} target="_blank" rel="noreferrer">API contract <ExternalLink size={14} /></a></div></section>
      </div>
    </div>
  </PageFrame>
}
