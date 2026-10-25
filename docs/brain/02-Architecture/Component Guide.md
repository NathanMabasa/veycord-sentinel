# Component Guide

This page defines the jobs of the main components. Each component should have one clear owner and documented interfaces; avoid duplicate pipelines and hidden data copies.

## Product and control plane

### Web application

What it does: lets an analyst explore events, manage sources and detections, triage alerts, build cases, and administer a workspace.

Must not: query arbitrary backend endpoints directly from the browser, embed secrets, imply an alert proves compromise, or expose another tenant's event identifiers.

### API / control plane

What it does: authenticates identities and ingest credentials, authorizes each request, validates input, manages workspace configuration, issues short-lived upload credentials where needed, and writes audit events.

Why separate it: the web UI is untrusted; authorization must be enforced server-side. In hosted mode, this layer is the tenant isolation boundary.

## Data plane

### Collector / forwarder

What it does: reads or receives data at the source, buffers briefly, authenticates to the ingest endpoint, retries safely, and reports health.

Recommendation: start with the upstream OpenTelemetry Collector and its receivers/exporters rather than creating a privileged Veycord agent. A first-party lightweight collector can be considered later if usability or source coverage proves inadequate.

### Ingestion gateway

What it does: accepts OTLP, bounded HTTP batches, or selected syslog transports; checks workspace key and quota; validates/decompresses safely; assigns an ingestion ID; hands work to a durable queue; returns an acknowledgement only after the chosen durability contract is met.

Security concern: event data is attacker-controlled. Strictly bound payload bytes, decompressed bytes, event count, nesting depth, field count, and processing time. Never execute payload content.

### Queue / buffer

What it does: absorbs bursts, decouples public ingest from parse/index workers, supports retry and back-pressure, and reports poison messages/dead letters.

Why it matters: without a durable queue, slow search/index operations can block event acceptance or lose data during spikes. Define at-least-once semantics and idempotent processing; do not imply exactly-once delivery.

### Parse and normalize workers

What it does: parse supported formats, validate timestamps, preserve raw source and provenance according to policy, normalize mapped fields, redact configured values, and route bad events to a visible quarantine/dead-letter path.

Recommended path: use OTel Collector processors where possible; own only Veycord-specific normalization and privacy behavior. Keep parsers versioned and fixture-tested.

### Event store and search engine

What it does: retains searchable normalized events, supports bounded queries and aggregations, enforces tenant scoping, and applies retention.

Candidates: OpenSearch for integrated text/document search and Sigma-based Security Analytics; ClickHouse for columnar analytics and storage efficiency. Do not select from popularity alone: run the benchmark and Sigma mapping spike in [[Data Plane Decision and Benchmark]].

### Raw archive

What it does: retains original payload/batches for replay or evidence where policy requires it. It is not automatically part of the searchable index. Apply tenant-scoped encryption/access, lifecycle retention, deletion coordination, and export rules.

### Detection scheduler and evaluator

What it does: schedules versioned rules against bounded time windows, tracks execution state, stores match evidence, deduplicates/groups findings, and emits alerts when configured conditions are satisfied.

Guardrails: query budgets, concurrency limits, rule sandboxing, schedule jitter, checkpointing, lag monitoring, and no user-provided scripts. A detection that is late or skipped must be visible.

### Alert and case service

What it does: turns findings into analyst work, records acknowledgement/assignment/notes, links event evidence, keeps a timeline, and produces a traceable export.

Audit changes and preserve event source references. Define whether case notes can be edited and whether edits are versioned.

### Search / query layer

What it does: exposes safe product-level search independent of backend syntax, adds tenant/time constraints, checks complexity and row/byte limits, cancels timed-out queries, and maps backend fields into a stable UI result.

Do not concatenate untrusted query strings into SQL/DSL. Separate filter builder AST from backend translation. Keep pagination cursor-bound and tenant-bound.

## Cloudflare hosted deployment roles

- Pages/assets: frontend and docs.
- Workers: edge API, auth checks, ingest endpoint, and lightweight routing. Avoid CPU-heavy parsing or long-running full scans in request handlers.
- Queues: durable asynchronous ingest handoff with explicit retry/retention limits.
- D1: identity/workspace/configuration and product metadata; avoid unbounded event storage.
- R2: raw archive or export bundles with lifecycle policy; not a secondary public file server.
- Dedicated search service: event index and detection scans when D1 benchmark fails.

All Workers requests that touch an external search service must add tenant scope server-side; never trust a tenant ID supplied only by the browser.

## Observability and operational components

- **Metrics:** ingest accepted/rejected, bytes, queue age/depth, parser failure, indexed lag, search latency/errors, detection lag/errors, quota state, and cost by tenant without high-cardinality personal labels.
- **Health:** distinguish liveness from readiness; indicate degraded search or detection state.
- **Audit:** separate security audit events from ordinary application logs; prevent secret/event-body leakage.
- **Backup and restore:** record scope/RPO/RTO, test recovery, coordinate raw/archive/index/case restoration, and validate deletion obligations.
