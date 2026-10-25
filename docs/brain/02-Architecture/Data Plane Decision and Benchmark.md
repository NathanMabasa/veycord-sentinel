# Data Plane Decision and Benchmark

## Why this decision is unresolved

Search/index choice controls cost, query UX, Sigma compatibility, deployment burden, event retention, and portability. Neither Cloudflare D1 nor R2 is a full SIEM search engine. The public API remains fixture-only. D-017 adds authenticated bounded ingestion and a PostgreSQL persistence prototype, but no representative sustained-volume benchmark. PostgreSQL is selected for the initial control/bounded-event store; the final high-volume event plane remains open.

## Candidates

### OpenSearch first

Strengths: Apache-2.0 project, text/document search, SQL and PPL options, mappings, index lifecycle policies, fine-grained access and audit options, and a Security Analytics plugin that uses Sigma-derived rules, detectors, findings, alerts, and correlation.

Costs/risks: Java/search cluster memory and operational overhead; self-host setup is heavier than a static app; multi-tenant SaaS isolation over shared indexes needs careful design; plugin APIs and supported Sigma translations need validation; exact cloud managed service and residency affect cost.

### ClickHouse first

Strengths: Apache-2.0 server, columnar analytics, sparse indexes, aggregation performance, compression and TTL capabilities, and well-established OpenTelemetry integrations.

Costs/risks: SIEM workflow components (Sigma conversion/mapping, scheduled detection, findings, case workflow, field-level security) need more Veycord implementation or additional services; arbitrary substring/full-text search behavior must be benchmarked; operational and cloud service terms/regions still need review.

### Cloudflare-only storage

Strengths: simple deployment integration with Workers and D1/R2/Queues.

Risks: Workers' CPU/request constraints, D1 storage/query limits, and R2's object storage model mean it may not support general-purpose SIEM search and detection cost-effectively at useful retention volumes. Keep as a small prototype hypothesis, not the assumed production engine.

## Spike workload

Generate and retain licensed synthetic fixtures shaped like:

- Linux auth and syslog events;
- Windows Security/Sysmon-like records;
- web access events;
- firewall and DNS events;
- cloud audit events.

Test both low-and-slow events and bursty batches; late events; duplicate delivery; high-cardinality user/host/IP fields; wide/nested JSON; Unicode/malformed input; rule matching; and retention expiration.

## Measure

- ingest accepted events/sec and bytes/sec at p50/p95/p99;
- time from source event to searchable event;
- queue age/depth and recovery after an outage;
- p50/p95 query latency for time+field, full text, aggregation, and dashboard workloads;
- p50/p95 detection lag and cost per rule;
- compressed storage/replica/index bytes per GB received;
- CPU, memory, disk/IOPS, cold start, and failure behavior;
- cost per workspace at chosen ingest/retention quotas;
- tenant isolation enforcement and resource contention behavior;
- deletion completion time across hot index, archive, backup, and case references.

## Decision gates

1. Compare OpenSearch and ClickHouse on same fixtures and hardware/service tier.
2. Verify Sigma rule import and required field mappings with a curated, license-reviewed sample.
3. Validate hosted multi-tenant boundary and operational access model.
4. Model total cost for a small free tier and a larger paid tier, including storage, query, backups, logs, egress, and support.
5. Pick one MVP engine and record the decision in the ADR register. Keep a backend adapter only where it protects real portability; do not build speculative multi-engine abstractions.

## Likely recommendation after spike

If the first-release value is portable threat detections and a complete SIEM workflow, favor OpenSearch. If benchmarks show storage/query economics dominate and Veycord is willing to own rule and case services, favor ClickHouse. Regardless of choice, Cloudflare can host the app/control edge while the event engine runs as a separate managed or self-hosted service.
