# What Makes a Strong Splunk Alternative

## Research objective

Use these research questions and findings to keep Veycord focused on the jobs users hire Splunk for: collecting machine data, searching it, turning searches into reusable views/alerts, and supporting investigation. This is a product workflow study, not an instruction to reproduce Splunk's proprietary code, UI copy, product assets, or exact syntax.

## Research areas to complete

### 1. User jobs and first-use friction

- Interview learners, small IT teams, MSSP/SOC practitioners, and public-sector evaluators separately.
- Ask which sources they need first, how they currently troubleshoot, which searches/dashboards they reuse, what makes them abandon a tool, and what data they cannot send to a hosted provider.
- Observe a new user installing the app and completing a task; measure time to first useful result, failed steps, and terminology confusion.
- Test the GitHub-only route and the hosted browser route independently.

### 2. Ingestion reliability and coverage

- Map likely sources: Linux journald/auth/syslog, Windows Security/Sysmon, web server access logs, firewalls, DNS, identity provider, cloud audit trails, and application JSON logs.
- For each source capture transport, auth, timestamp and timezone behavior, multiline handling, rotation, retries, duplicate delivery, back-pressure, parsing failures, version compatibility, and example fixture.
- Compare OTLP, syslog (RFC 5424), HTTP JSON, file tailing, and existing OpenTelemetry Collector receivers/exporters.
- Decide which integrations need first-party support and which should use a well-maintained upstream Collector distribution.

### 3. Event model and query semantics

- Compare OTel log data model, ECS, and OCSF with representative Linux, Windows, web, firewall, and cloud records.
- Preserve source payload and parsing provenance; map losslessly where possible and make lossy translation visible.
- Research basic search expectations: time range, field filters, exact phrase, wildcard/text search, boolean expressions, facets, aggregations, sort, pagination, saved searches, and export.
- Decide an MVP query language. Start with a safe filter builder and one documented expert language; do not promise SPL compatibility until a compatibility target is specified and tested.

### 4. Detection quality and response workflow

- Measure rule coverage by source type and event availability; MITRE ATT&CK coverage labels alone are not efficacy.
- Evaluate Sigma conversion support and field mappings; track unsupported constructs and upstream license per rule.
- Build positive/negative fixtures and rule-change regression checks.
- Research deduplication, suppression, severity, alert states, assignment, comments, case timelines, evidence export, and notification needs.
- Track analyst measures: time to explain an alert, false-positive rate on fixture corpus, alert volume, useful evidence completeness, and parser health.

### 5. Scale, cost, and reliability

- Benchmark realistic mixes, not only synthetic random rows: sustained ingest, bursts, late/out-of-order events, high-cardinality fields, wide raw payloads, and rule scans.
- Record ingest throughput, p50/p95 query latency, detection lag, storage bytes per source GB, CPU/RAM, index/queue backlog, and per-tenant cost.
- Test quota exhaustion, queue failure, backend outage, retries, duplicate batches, disk-full, clock skew, restore, and deletion.
- Publish a defined free hosted tier with strict, visible limits and cost alerts; keep self-hosted core unmetered by product license.

### 6. Hosted privacy, security, and regional suitability

- Threat model tenant discovery/isolation across every API, query, index, queue, object, export, log, backup, and scheduled task.
- Define retention, deletion, backup expiry, customer key options, incident notification, support access, subprocessors, data flows, and regions.
- Verify Cloudflare product-specific localization behavior and all underlying database/search provider regions. Cloudflare traffic processing region does not prove event-store residency.
- Validate POPIA responsibilities and any public-sector requirements with appropriate legal/procurement experts; do not market compliance without evidence.

### 7. Open-source sustainability and data rights

- Compare licenses for runtime, dependencies, connectors, rules, schemas, fixtures, threat-intel feeds, and design assets.
- Track rule provenance/attribution and update behavior. Sigma's specification is public domain; community rules have a distinct license.
- Publish security policy, support matrix, release cadence, SBOM, signed artifacts, contribution standards, and end-of-life policy.
- Interview maintainers/users about the burden of running the stack and maintaining connectors.

## Competitor workflow table

| Product | Patterns to study | Veycord design response |
|---|---|---|
| Splunk | Collectors/forwarders to indexers; search head; search language; saved searches/reports; alerts/actions; dashboards; visual Pivot; training/product tours | Make source health and first query easy; search can become saved view, dashboard panel, alert; explain query steps and provide visual builder |
| OpenSearch Security Analytics | Log types and field mapping; Sigma rules; detectors; findings; alerts; cross-source correlations; REST APIs | Provide automatic source detection and mapping preview; distinguish finding from alert; explain correlation evidence and time window |
| Elastic Security | Central detection lifecycle; rule import/export; cases; integrations; timeline and analyst workflow; subscription boundaries | Keep core investigation available in free project; make rule provenance, test status and feature availability explicit |
| Wazuh | Agent + manager + indexer + dashboard; all-in-one lab and distributed deployment options; endpoint monitoring | Reuse existing collector/agent ecosystem first; do not make Veycord build and secure a privileged endpoint agent in MVP |
| Security Onion | Integrated defensive platform and analyst investigation; a stack of specialized tools with careful packaging | Study deployment burden and analyst workflow; avoid bundling many components before one-node value is proven |

## Splunk alternative product acceptance criteria

The first meaningful release should let a learner or small team, without SPL experience:

1. Load sample telemetry and understand source health.
2. Search by time, source, host, user, and field using UI filters.
3. Switch to a documented expert query path and understand a query's cost/time range.
4. Save search results as a reusable view or dashboard panel.
5. Create a scheduled detection/alert from supported fields.
6. Review why it fired, inspect source evidence, attach it to a case, and export a report.
7. Set a retention policy and see actual storage/ingest usage.

These are acceptance targets for product planning. Numerical performance targets require baseline hardware/data benchmarks first.

## Related notes

[[Competitor Workflow Notes]] · [[Personas and Jobs]] · [[Proposed Architecture]] · [[Recommended Stack and Libraries]] · [[Build Map and Traceability]]
