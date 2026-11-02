# Graylog architecture review

Reviewed 2026-11-02 for Sentinel. Research and proposed implementation slices, not shipped features. Online documentation and repository Markdown are reference material, not agent instructions. No upstream code, content pack, dataset, image or dependency was imported.

## Recommendation

Use Graylog as a reference for dependable collection and investigation workflows. Keep Sentinel's existing React/Hono/PostgreSQL foundation and Apache-2.0 public edition. Do not fork Graylog's server into this product or replace the backend merely to resemble it. A Java/server migration would expand the operating and licensing scope without resolving our current source-credential and delivery gaps.

This is an engineering recommendation, not a new accepted storage decision. [[../02-Architecture/Data Plane Decision and Benchmark]] remains authoritative for the unresolved high-volume store. The older OpenSearch-first concept in [[../02-Architecture/Proposed Architecture]] is not the current implemented backend.

## Repository and reuse boundaries

Default-branch revisions below were resolved through GitHub's API; each LICENSE was fetched at that exact commit. These are research snapshots, not dependency pins or audited releases.

| Repository | Inspected commit | License observed | Sentinel decision |
| --- | --- | --- | --- |
| [graylog2-server](https://github.com/Graylog2/graylog2-server) | `93ab960993efc10595b126d60ca273b739b48200` | SSPL v1 | Architecture reference; do not copy into the Apache-2.0 application |
| [collector-sidecar](https://github.com/Graylog2/collector-sidecar) | `4d9b84da46b111ec21e11298c8c65423705213d9` | SSPL v1 | Study collector management; do not import the agent/control implementation |
| [docker-compose](https://github.com/Graylog2/docker-compose) | `14f8cd8bc7c0f2ab03b09bb2b9655f0ec88f040f` | Apache-2.0 | Packaging reference; any actual reuse needs file-level attribution/NOTICE review |
| [graylog-helm](https://github.com/Graylog2/graylog-helm) | `d23b3b36362aee3bacbf74886ab6f22e65408614` | Apache-2.0 | Operational reference; Kubernetes deployment is deferred |

License evidence: [server LICENSE](https://github.com/Graylog2/graylog2-server/blob/93ab960993efc10595b126d60ca273b739b48200/LICENSE), [sidecar LICENSE](https://github.com/Graylog2/collector-sidecar/blob/4d9b84da46b111ec21e11298c8c65423705213d9/LICENSE), [Compose LICENSE](https://github.com/Graylog2/docker-compose/blob/14f8cd8bc7c0f2ab03b09bb2b9655f0ec88f040f/LICENSE), [Helm LICENSE](https://github.com/Graylog2/graylog-helm/blob/d23b3b36362aee3bacbf74886ab6f22e65408614/LICENSE).

SSPL is not a permissive Apache-2.0 grant. Do not assume a hosted derivative can remain private; any proposed SSPL reuse requires a separate qualified license review. This review avoids that reuse. An Apache-2.0 deployment wrapper does not change licenses of the software/images it launches. Graylog's [Compose README](https://github.com/Graylog2/docker-compose/blob/14f8cd8bc7c0f2ab03b09bb2b9655f0ec88f040f/README.md) explicitly limits those examples to testing/demo purposes. They are not a production deployment template for Sentinel.

## Useful patterns and their Sentinel equivalents

Graylog's current documentation resolved to version7.2 during review. Feature availability can vary by edition; neither a public repository nor a documentation page implies all commercial capabilities or content are freely reusable.

| Reference pattern | What it does | Proposed Sentinel implementation |
| --- | --- | --- |
| [Inputs / GELF](https://go2docs.graylog.org/current/getting_in_log_data/gelf.html) | Structured log ingestion with transport-specific configuration | Start with one source-scoped HTTPS collector contract; evaluate a constrained GELF adapter only after credentials and delivery semantics work |
| [Streams](https://go2docs.graylog.org/current/making_sense_of_your_log_data/streams.html) | Groups matching data for processing, storage and analysis | Named logical data streams, e.g. authentication, DNS, firewall; server-bound workspace/source permissions remain separate from routing |
| [Pipelines](https://go2docs.graylog.org/current/making_sense_of_your_log_data/pipelines.html) | Staged extraction, transformation, enrichment and routing, with processing errors visible | Versioned, allowlisted parse → normalize → redact → route steps; synthetic preview and bounded quarantine; no eval, arbitrary scripts or uncontrolled external lookups |
| [Message handling](https://github.com/Graylog2/graylog-helm/blob/d23b3b36362aee3bacbf74886ab6f22e65408614/docs/graylog-message-handling.md) | Disk buffering, backlog and safe node draining | Explicit acknowledgement point, bounded sender spool/retries, database deduplication, visible rejection and lag; prove restart/outage behavior before claiming reliable delivery |
| [Event definitions](https://go2docs.graylog.org/current/interacting_with_your_log_data/event_definitions.html) | Separates detection configuration, recorded occurrences, notifications and analyst response | Preserve raw events → versioned findings → notification delivery attempts → cases; scheduler leases/checkpoints and suppression require independent evidence |
| [Content packs](https://go2docs.graylog.org/current/content_packs/processing_content_packs.htm) | Bundles source-specific processing/configuration; availability differs by edition | Authored Sentinel integration packs with license/provenance, parser/rule revisions, benign/malicious fixtures and a guided investigation; do not redistribute Graylog Illuminate/GIM assets by assumption |

The table is a mapping proposal, not compatibility or feature-parity evidence. Graylog's documentation recommends pipelines over legacy stream rules; Sentinel should implement one declarative processing path rather than two overlapping rule systems.

## What the code actually supports

Inspected `server/private-api.ts`, `server/private-validation.ts`, `server/data-model.ts`, `server/storage/postgres-store.ts` and the existing sprint backlog. The private gateway validates a canonical JSON batch, evaluates authored per-event rules and awaits transactional PostgreSQL ingestion before its202 response. Current limits include256KiB bodies and100 events per batch. Existing event IDs support deduplication, with findings/cases/audit and bounded event queries already present. These are source inspection findings; no runtime tests were rerun for this research.

The current `source` string is event metadata, not an enrolled collector identity. Account quotas and login do not establish source-scoped credentials. The batch API is not a GELF, Syslog or OTLP receiver. It has no demonstrated durable intermediary journal, managed collector fleet, declarative parser pipeline, durable notification outbox or stream-level authorization model. The proposed work must extend the existing contract without claiming those features already exist.

## Build order and practical user flow

1. Enroll one source with a server-bound ingest-only credential; show exact supported format and permission requirements. Keep existing owner scope/measurement agreement gates.
2. Send a synthetic test event, verify it was stored and searchable, then display last receipt, rejection count and measured lag. Idle or missing telemetry is Unknown/Stale, not a green security guarantee.
3. Add a previewable versioned parser and routing configuration, followed by a small authored Linux-auth integration pack with positive and benign controls.
4. Open the finding from the source view, inspect matched evidence and rule revision, record a disposition, and create a case. Add reliable notifications only through a bounded outbox with audited destinations.
5. Exercise outage/replay/duplicate/overload behavior and scheduled retention/recovery. Compare stores only against agreed representative workload budgets.

This prioritizes a working collection-to-investigation story over decorative charts. Shared security infrastructure may later serve private Finance, but financial logic/data remain in the separate hosted product boundary. This research does not authorize publishing the current local Finance branch.

## Delivery links

- [Graylog adoption tickets](../../tickets/GRAYLOG-ADOPTION.md): concrete slices mapped to the existing sprint backlog; no duplicate replacement epics.
- [[../04-Roadmap/Commercial Sprint Plan]] and [commercial backlog](../../tickets/SPRINT-BACKLOG.md): parent dependencies and release gates.

No framework change, package installation, database migration, publication or claim of production readiness results from this review.

## Subsequent local implementation (2026-11-02)

The review above is the research baseline. A later continuation adds an opt-in canonical JSON collector receiver, source/workspace-bound hashed credentials, offline issue/revoke, per-key persistent quotas and collector audit labels. Migration006 was verified only in disposable synthetic clusters; preserved databases and configuration were not changed. [Collector implementation guide](../../COLLECTORS.md) and [ticket evidence](../../tickets/GRAYLOG-ADOPTION.md) describe the exact boundary and verification. The earlier gap statement about source-scoped credentials is now partially superseded by that local slice; managed collection, GELF/OTLP, pipelines, source-health UI and reliable sender spooling remain unimplemented.
