# Framework Decision and Research Plan

Research checked 2026-10-23 against primary framework/runtime documentation. The first UI slice now exists as a React + TypeScript + Vite app. It validates the client-side shell and responsive design only; it does not validate Worker/API runtime, ingest, tenancy, backend, or production operations.

## Recommended application framework

### Frontend: React + TypeScript + Vite

Use a React single-page application with TypeScript, built with Vite and deployed as Cloudflare static assets. Cloudflare documents this path directly, including a Worker API and the Cloudflare Vite plugin. It fits an authenticated, interactive security console: event tables, query filters, detection editors, alert queues, and case timelines are application screens rather than search-engine landing pages that require server rendering.

TypeScript gives the UI and API explicit types for event, finding, alert, case, workspace, and query contracts. Cloudflare's Vite plugin runs Worker code in `workerd` locally, reducing differences from production.

### API: Cloudflare Worker, Hono for routing

Use a small TypeScript Worker for session checks, workspace configuration, bounded query orchestration, ingest credential checks, quota enforcement, and routing to the event backend. Hono is a candidate for routing/middleware because Cloudflare documents its use in Workers. Keep authorization and tenant scoping in explicit application services rather than relying only on route middleware.

Keep parsing and detection scans out of request handlers. Let the selected event engine run its native detection schedules or send bounded jobs to queue consumers. Workers have CPU and memory limits and are not general long-running daemons.

### Data/search is a separate decision

The web framework does not determine the SIEM engine. Benchmark OpenSearch Security Analytics first against ClickHouse using [[02-Architecture/Data Plane Decision and Benchmark]]. OpenSearch is the initial favorite because it includes Sigma-based security analytics, detectors, findings, alerts, correlation, and APIs. If it wins, use Cloudflare for the UI/control/ingest edge and connect to a separately hosted OpenSearch service. Keep a self-hosted deployment path for the open-source edition.

## Why not start with Next.js

Next.js can run on Cloudflare. Current Cloudflare documentation recommends vinext as the default path, but labels vinext beta. An SIEM console does not need server rendering for its main workflow, so adding Next.js/vinext adds framework/runtime surface without a demonstrated need. Revisit if public pages need server rendering or a concrete console requirement emerges and a compatibility spike proves stable support.

## Why not choose Vue or Svelte first

Both can build strong dashboards, and Cloudflare supports multiple frameworks. No product requirement favors them over React today. React + Vite has a direct Cloudflare-supported path and matches available React engineering guidance. Prefer another framework only if the team has much stronger expertise there or a measured technical need.

## Research needed before implementation

### P0 — before a real-data vertical slice

1. **Real-data vertical slice:** authenticated ingestion → bounded normalization → selected storage/search backend → filtered search → one detection → alert evidence → case record. The public API stays synthetic. D-017 adds a private Node/Hono + PostgreSQL vertical slice; enterprise identity, operation and volume validation remain gates.
2. **Backend benchmark:** OpenSearch Security Analytics vs ClickHouse with the same event corpus and workloads; measure p95 latency, ingest lag, storage, resource use, and cost.
3. **Cloudflare feasibility:** Worker-to-backend connectivity, timeouts, query cancellation, queue retries, secrets, deployment previews, local runtime parity, and D1/R2 behavior.
4. **Authentication/tenancy:** select identity implementation only after verifying Cloudflare compatibility, recovery, MFA/admin hardening, workspace membership, ingest keys, revocation, sessions, and complete authorization boundaries.
5. **Event model and sources:** select the first two source paths and compare OTel, OCSF, ECS, and Sigma mappings using representative synthetic/licensed fixtures.

### P1 — before a private hosted pilot with real telemetry

6. Data classification and privacy review: personal data fields, redaction, region/provider chain, subprocessors, retention/deletion, support access, and POPIA role/contract review.
7. Tenant isolation exercise: cross-tenant queries, guessed event IDs, export URLs, queued jobs, object paths, saved searches, and scheduled detections.
8. Abuse/cost controls: per-workspace event/byte quotas, burst caps, expensive-query budgets, retention ceilings, quarantine bounds, cost alerts, and safe behavior at quota.
9. Reliability: duplicate delivery, replay, late/out-of-order events, queue/backend outage, restore, deletion completion, and incident exercise.
10. Usability sessions with beginner analysts and small IT teams; observe sample-to-first-investigation and source onboarding.

### P2 — before public availability and government demonstrations

11. Independent security review against a risk-selected OWASP ASVS baseline; document evidence and unresolved requirements.
12. Supply-chain and release review: license inventory, signed releases, SBOM, dependency update policy, vulnerability disclosure, backup/restore evidence.
13. Scale/cost tests at actual free-tier and intended paid-tier quotas; publish measured limits and service objectives.
14. Confirm public-sector data residency/procurement requirements with the evaluator; do not infer them from a hosting provider's local point of presence.

## Framework selection

| Option | Cloudflare support | Fit | Decision |
|---|---|---|---|
| React + TypeScript + Vite SPA + Worker API | Direct documented path with Cloudflare Vite plugin | Interactive authenticated SIEM console; avoids SSR complexity | Recommend MVP |
| Next.js with vinext on Workers | Cloudflare's current recommended path; vinext is beta | Useful where SSR/server components matter; adds compatibility surface | Revisit only on need |
| React/Vue/Svelte SPA plus separate API | Supported general architecture | Portable, but separates runtime and adds operational pieces | Fallback if Worker API fit fails |

## Decision

Adopt **React + TypeScript + Vite for the console/demo; a Cloudflare Worker API using Hono for routing; OpenSearch Security Analytics as the first search/detection candidate, pending benchmark**. This gives a buildable direction while keeping the data-plane decision evidence-gated.

## Implementation status (updated 2026-10-24; earlier notes below are historical)

- Created the React + TypeScript + Vite application shell, responsive docs-led public site, and product preview built from the same demo fixtures.
- Added a local synthetic-data analyst console with working navigation, event search/source/severity filters, event detail/raw JSON, starter detection guidance, alert resolve/reopen, case creation, local settings, saved searches, JSON export, and demo reset.
- Demo state for cases, alert status, settings, saved searches, and light/dark appearance is stored in this browser's versioned localStorage namespace; no telemetry is transmitted.
- Added a reduced-motion-aware GSAP hero entrance, responsive dashboard spacing/theme treatment, and a corporate site refinement pass informed by current Refero patterns. Added a secure product lifecycle with explicit release gates in [[Secure Product Development Lifecycle]]. Current API status: `server/app.ts` provides a Hono Fetch-compatible read-only API over synthetic fixtures; `vite.config.ts` mounts it in Vite development and preview only. `docs/API-v1.md` documents this implemented local slice and separately lists unimplemented endpoints/future hosted requirements. It is not a deployed Worker service.
- The overview only reports counts derived from the bundled fixtures and current local alert state; its chart is labeled illustrative.
- Added a short analyst learning guide and sample source browser.
- Added Product, Docs (implemented synthetic API reference plus clearly separated future endpoint proposals), Roadmap, Security, Community, and Demo routes, plus responsive navigation and a hero GitHub CTA driven by `VITE_GITHUB_REPOSITORY`. It currently points to the Community repository-status section because no accessible Veycord repository was available during this build. The CTA must use a configured repository URL only after one exists.
- Demo event records and chart counts are synthetic fixtures. The console's search filters the fixture list only. Alert/case workflows are browser-local, not backend services. Cases now allow editable notes, close/reopen, JSON export, and duplicate prevention per alert. Persisted state is shape-checked and bounded; storage failure leaves the demo usable for the session and is disclosed in the UI.
- Updated batch 002: the separate private workspace implements service-key authentication, fixed server workspace, bounded ingestion, PostgreSQL persistence and RLS. Public demo storage stays browser-local. Interactive identity/roles, collector connections and production hosted telemetry remain unimplemented; do not use real telemetry before rollout review.
- The supplied images are brand-board references rather than export-ready logo files. The app currently uses a CSS geometric placeholder mark; replace it with the approved vector asset when available.

Next slices: complete the data-plane benchmark and event-schema choice; then design and test ingestion, normalization, persistence, authorization, and operations against the selected architecture. The local API is already a synthetic read-only contract demonstrator. Keep hosted real telemetry gated until identity, tenant isolation, quotas, privacy, deletion, and operations evidence exists.

## Sources

- [Cloudflare React + Vite framework guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/react/)
- [Cloudflare Vite plugin and local `workerd` behavior](https://developers.cloudflare.com/workers/local-development/vite-plugin/)
- [Cloudflare Hono guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/hono/)
- [Cloudflare Worker limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Worker best practices](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
- [Cloudflare Next.js / vinext status](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)
- [React TypeScript guide](https://react.dev/learn/typescript)
- [OpenSearch Security Analytics setup flow](https://docs.opensearch.org/latest/security-analytics/sec-analytics-config/)


## Startup and integration evidence (2026-10-24)

The application module is dynamically imported behind a real readiness loader with a reduced-motion-aware GSAP handover, error recovery, and no-JavaScript fallback. Integration now verifies the actual same-origin synthetic API explorer rather than only its bundle. The earlier API explorer audit timeout came from Playwright text-label matching against a wrapping select label; inspection showed the correct route and accessible combobox were present. Explicit control IDs and role-based assertions resolve the ambiguity. See `docs/audit/INTEGRATION-AUDIT.md` for current evidence and remaining production gaps.
