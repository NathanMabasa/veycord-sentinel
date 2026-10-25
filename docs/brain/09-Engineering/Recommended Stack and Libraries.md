# Recommended Stack and Libraries

## Current repo state

As of 2026-10-24, the repository has a React + TypeScript + Vite console and a Hono API serving synthetic fixtures through Vite development and preview middleware. This is a local demo slice, not a deployed Cloudflare Worker or product data backend. The library and deployment choices below remain recommendations for the future product; they are not all implemented or selected.

The current framework recommendation is in [[Framework Decision and Research Plan]]: continue React + TypeScript + Vite for the console; evaluate Cloudflare Worker deployment with Hono; and select a SIEM/search backend only after the workload benchmark.

## Proposed stack for a Cloudflare-first product

### Frontend

- **React + TypeScript + Vite**, deployed as static assets through Cloudflare Workers/Pages. Cloudflare's official full-stack Workers guide provides a React SPA + Hono API + Vite template.
- Keep UI state local and explicit; use `fetch` to the versioned API; avoid a second large state framework until a real need appears.
- **Zod** for runtime validation of API responses and user-facing forms where useful; do not treat client-side validation as a server security control.
- Pick a charting library after dashboard design needs are concrete; evaluate license, accessible keyboard/contrast behavior, data volume, bundle size, and time-series handling.

### Cloudflare API/control plane

- **TypeScript Worker + Hono**: small HTTP routing and middleware framework documented by Cloudflare for Workers. Use only platform-supported Web APIs in the request path.
- **D1 + Drizzle ORM** for workspace/identity/configuration relational metadata if schema migration and local-runtime support prove reliable. Keep every query tenant scoped and parameterized.
- **Queues** for asynchronous ingestion handoff; use explicit batch size, retries, dead-letter queue and idempotency keys.
- **R2** for compressed raw batch/archive objects only when justified by retention/replay needs; apply lifecycle and object authorization.
- **Wrangler + Cloudflare Vite plugin** for local worker-compatible development and deploy configuration.

### Event collection and data plane

- **OpenTelemetry Collector Contrib** as first choice for existing file, syslog, OTLP, and vendor receiver/exporter coverage. Pin a distribution with only needed components; don't ship an unnecessarily broad collector.
- **OpenSearch Security Analytics** is the preferred first SIEM engine to benchmark because its security analytics layer already covers log types, mappings, Sigma-based detectors, findings, alerts, and correlation. Use supported official APIs, not direct writes to plugin internal indexes.
- **ClickHouse** is the principal alternate benchmark for columnar storage/query. Use its official Go or HTTP client only if selected. Don't add a second database to production without a measured need.
- Keep OTel LogRecord/Event timestamp, observed timestamp, resource and attributes semantics where feasible. Compare against OCSF/ECS mappings before finalizing the normalized event schema.

### Identity and authorization

- Do not build homegrown authentication. Select a maintained identity solution after a Cloudflare Worker/D1 compatibility spike and a hosted tenancy threat model.
- Cloudflare Access is useful for protecting internal admin/staging surfaces, but is not automatically the consumer sign-in system for public customer accounts.
- Better Auth has Cloudflare documentation for its Cloudflare OAuth provider; that page is specifically provider sign-in, not by itself a complete multi-tenant auth design. Evaluate the current Better Auth D1/Workers adapter and security advisories before adoption.
- Model workspace membership, role, resource, and action. Enforce access server-side on every endpoint/query. Add MFA/admin stronger auth and session protections before public real-data access.
- Consider OPA only if authorization rules become complex across services; do not add a policy engine for a small fixed role model.

### Schema and detection libraries

- **Sigma specification / pySigma:** use standard format and tooling for rule parse/validation/translation; validate target backend support and individual rule licenses. The SigmaHQ rules repository uses DRL 1.1; do not assume all rules are permissively reusable.
- **OCSF schema tooling** and **ECS**: use as references/mappings; select a canonical Veycord event envelope after fixtures prove mappings. Avoid translating every source into multiple redundant schemas.
- Use a YAML parser with safe loading, strict schema, size/depth limits, and disabled custom tags for imported rules/configs.

## Dependency selection policy

Before adopting a library, record: component need, current maintenance/release activity, supported runtime, license, direct/transitive dependency count, known vulnerabilities, platform fit, alternative, and removal plan. Prefer standard library or established upstream components where they materially reduce custom protocol/parsing code. Pin with a committed lockfile and automate update review.

## Explicitly avoid for MVP

- Writing a custom log shipper and parser framework when OTel Collector already covers the source.
- Running OpenSearch and ClickHouse together absent benchmark evidence.
- A homegrown query language parser that claims SPL parity.
- A custom authentication/authorization framework.
- User-defined JavaScript, Rego, Python, shell or SQL snippets in rules.
- AI triage or automated containment as a substitute for deterministic evidence.

## Component ownership diagram

```text
Browser (React)
   │ session-authenticated, tenant-scoped API
Cloudflare Worker API (Hono) ── D1 (identity/workspace/cases/config)
   │ ingest key + quota check
Cloudflare Queue ── parse/normalize worker ── Search backend (benchmark-selected)
                                           └─ R2 archive (optional, retention-bound)
OpenTelemetry Collector ── OTLP/HTTP or approved receiver ───────────────┘
```

The diagram is a logical proposal. The selected backend may require a separately operated service outside Cloudflare Workers.
