# Web Hosting Strategy

## Product direction

### Public distribution implementation (2026-10-28)

Batch007 adds a database-free ESM Worker containing the existing synthetic Hono API and embedded React/Vite assets, published through Sites on Cloudflare infrastructure. GitHub remains the primary open-source repository. The public `/workspace` explains private self-hosting and never requests an operator credential. There are no D1/R2/database/connector bindings. Publication status and exact source/version evidence are recorded in `docs/tickets/BUILD-BATCH-007.md`; registration alone is not deployment success. See `docs/PUBLIC-WEB.md`. The public demo adapter does not deploy the private Node/PostgreSQL service or complete the real-telemetry gates below.

Veycord Sentinel should support both self-hosting and an optional hosted application where users can send real security telemetry to their Sentinel workspace. The hosted service is a real product requirement, not only a synthetic demo. Keep the public demo separate and synthetic so prospective users can explore without creating an account or exposing data.

The hosted service can be free to start with clearly stated per-workspace ingestion, storage, and retention quotas. Do not promise unlimited free real-log hosting: infrastructure costs grow with ingest and retention. A small free tier can be sustainable if quotas and automatic cost controls are enforced, with self-hosting remaining available for unlimited user-controlled infrastructure.

## Cloudflare fit

Cloudflare can serve the web UI, API, and ingestion edge. Its Workers, Queues, D1, and R2 products can support an early controlled pilot. They are not automatically a complete SIEM data plane:

- Workers Free currently has a 100,000 requests/day and 10 ms CPU limit; paid Workers has usage pricing and a higher CPU allowance. Request body maximums depend on the account plan.
- Queues free allowance is bounded and free message retention is 24 hours; paid default retention is longer but also bounded.
- D1 currently allows 500 MB maximum per database on Free and 10 GB on Workers Paid. It is appropriate for workspace metadata and small pilot metadata, not a high-volume event index without compelling benchmarks.
- R2 includes 10 GB-month standard storage and request allowances, then usage pricing. It is a fit for event archives/batches, not an indexed search engine by itself.

### Candidate architecture for a constrained pilot

- **Cloudflare Pages:** UI and documentation.
- **Workers:** authenticated API and ingest endpoints, tenant-aware authorization, rate/body limits, schema validation, and redaction hooks.
- **D1:** tenant/user/role config, saved searches, connector metadata, cases, and audit metadata. Avoid raw high-volume events by default.
- **Queues:** decouple ingestion from parsing and detection; use retry policy and dead-letter queue.
- **R2:** raw event archive or compressed batches, lifecycle and retention policies, tenant-scoped object keys, short-lived access.
- **Search index:** benchmark alternatives. A modest D1-backed pilot may work with strict limits; sustained SIEM search likely needs a dedicated search/columnar backend, which adds cost and may be outside Cloudflare. Be transparent if the UI/API run on Cloudflare while indexed data uses a specialist service.

The first technical spike should measure ingestion throughput, query latency, detection scheduling, stored bytes per ingested GB, and cost at realistic event volumes. Use generated or explicitly authorized test telemetry until controls are verified.

## Hosted real-data safeguards and gates

Before a public real-data service:

- Tenant isolation in API, DB queries, indexes, queue messages, object paths, search results, exports, and background jobs; automate cross-tenant authorization tests.
- Authenticated workspace creation and revocable, least-privilege ingest credentials; MFA for administrators where feasible.
- Explicit per-workspace ingest caps, burst limits, storage quotas, retention defaults/maximums, budget alerts, back-pressure, and safe behavior at quota.
- TLS, encryption at rest, secret management, protected backups, tested restore and deletion workflows.
- Redaction/minimization options; never log passwords, tokens, or raw secrets.
- Audit history for logins, permissions, source changes, exports, retention/deletion, and rule changes.
- Published data location, subprocessors, retention, deletion, backup lifecycle, security contact, incident response, and service limits.
- POPIA processor/responsible-party terms as applicable, and independent security review before general availability.

Do not claim Cloudflare hosting alone makes customer use POPIA compliant or government approved. Cloudflare's Data Localization Suite is a paid Enterprise add-on. Regional Services can constrain where HTTPS traffic is decrypted and processed, but it does not by itself determine where application data is stored. Cloudflare's published Customer Metadata Boundary currently offers EU or US storage regions, not South Africa. A Johannesburg point of presence does not prove that logs, indexes, backups, or metadata remain in South Africa. For strict local-residency needs, offer self-hosting or customer-managed deployment in an approved environment.

## Web experiences

### Public demo

Host the product site and browser/sandbox demo on Cloudflare Pages. Demo data is synthetic, resettable, and not mixed with customer telemetry. Clearly label it as a demo and do not allow log uploads.

### Hosted workspace

Offer account sign-up for real logs only after the gates above. Show workspace region, retention setting, usage/quotas, and ingestion key management prominently. Start with an invitation-only pilot; expand only after reviewing abuse, security, support, and cost data.

### Self-hosted

Keep GitHub source/releases and self-hosting a first-class option. It is the path for users who need data control, offline operation, or deployment inside their own cloud/network.

## Delivery sequence

1. Host docs and synthetic demo on Cloudflare Pages.
2. Benchmark Cloudflare Workers + Queues + D1 + R2 with generated security events.
3. Select the search index and define free-tier quotas from cost measurements.
4. Implement tenant isolation, quotas, deletion/export, auditability, and abuse controls; perform private security review.
5. Pilot real telemetry with invited users and explicit retention limits.
6. General availability only after independent review, POPIA terms/process, incident readiness, and operating-cost funding.

## Related notes

[[Deployment and Cost Model]] · [[First Run and Learning Path]] · [[POPIA and Government Readiness]] · [[Decision Register]]
