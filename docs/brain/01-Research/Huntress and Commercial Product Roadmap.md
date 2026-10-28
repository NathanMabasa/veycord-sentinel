# Huntress and Commercial Product Roadmap

Research date: 2026-10-28. Status: proposals for owner review; no commercial-readiness approval or new implementation. Public product pages were reviewed, not an authenticated Huntress tenant, its code or an independently assessed service. Vendor capability statements are attributed claims. Do not copy proprietary assets, rules, text or branding.

## What the reference actually offers

- [Managed SIEM](https://www.huntress.com/platform/siem): collection, selective log filtering, search, reporting, retention options and SOC investigation. Learn from the source-to-incident workflow and explainable costs. Published retention options are not a legal requirement for Sentinel.
- [Managed ITDR](https://www.huntress.com/platform/managed-itdr): identity investigation covering suspicious sign-ins, OAuth applications and mailbox activity, with incident timelines. Our proposal is a narrower, read-only identity monitoring slice first.
- [Managed EDR](https://www.huntress.com/platform/managed-edr): endpoint behavioral visibility, persistence/lateral-movement detection, canaries and remediation. A log collector alone cannot implement these protections. First integrate existing endpoint alerts; a new endpoint protection engine is a separate engineering and support commitment.
- [Managed ISPM](https://www.huntress.com/platform/managed-ispm): configuration posture, drift, report-only impact assessment and policy enforcement. Start with read-only assessments; write actions need approval, impact previews and recovery.
- [Platform](https://www.huntress.com/): software is paired with a staffed continuous response service. An open-source application does not provide staffed response hours by itself.

## Sentinel baseline

The public site is a synthetic demo. The separate private Node/PostgreSQL foundation has authenticated bounded JSON ingestion, events, six experimental single-event rules, findings, cases, fixed-window analytics, logical quotas, mutation audit, manual retention and manual encrypted backup/recovery. Batch009 provides download/self-host and HTTP setup. It does not provide public customer accounts, automatic collectors, managed SOC, interactive roles, scheduled detection correlation or automated endpoint response.

Current implementation references: [[../09-Engineering/Build Map and Traceability]], [[../03-Security/Detection Coverage]], [[../02-Architecture/Operational Controls]], `docs/tickets/NEXT-RELEASE-GATES.md` and `docs/tickets/BUILD-BATCH-009.md`.

## Recommended initial commercial scope

Proposed positioning: an open-source investigation and security-monitoring workspace for small IT teams, with optional operated hosting. Validate this audience with prospective users before pricing or a delivery commitment. The first supported offering should name exact sources, deployment topology, operating limits, retention, support hours and exclusions.

Deliver one dependable journey: enroll a source → verify actual data arrival → show an explained detection → investigate related evidence → record disposition → export a redacted report. A narrower supported deployment can have commercial value without claiming broad SIEM/EDR equivalence.

### Buildable product modules

1. **Source enrollment and health:** individually scoped/revocable credentials, installation/configuration instructions, parser version, heartbeat, last event received, delivery lag, accepted/rejected/quarantined counts, retry and queue state. Distinguish collector heartbeat from telemetry arrival; an idle source is not necessarily broken. Source identity is server-bound, never trusted from payloads.
2. **Investigation timeline and case report:** durable analyst assignment, evidence links, event time versus receipt time, decision history, remediation checklist, redacted bounded export and export audit. Preserve original facts and rule revision; late events and reopened cases must remain understandable.
3. **Detection operations:** real windowed correlation, scheduler health, version/review/rollback history, scoped suppressions with owner/reason/expiry, benign and malicious fixtures, late-event behavior and measured quality. Start with a documented subset; unsupported imports fail visibly rather than silently weakening a rule.
4. **Notifications:** configurable severity/routing, signed webhook delivery or an approved mail service, persistent retry queue, deduplication, delivery status and escalation. User-provided destinations require SSRF/egress controls; no automatic sending is configured by this research.
5. **Identity monitoring:** Entra sign-in and audit events first; failed-then-successful sign-in correlation and suspicious changes where exact source fields are available. Mailbox forwarding and OAuth-grant detections require their own supported audit sources, scopes and licensing checks. Location anomalies are leads, not proof of token theft or account takeover.
6. **Asset and posture views:** source-derived host/user inventory, telemetry freshness and provenance; subsequently approved read-only configuration checks and drift comparisons. An absent field is Unknown, not Healthy. Inventory does not establish exploitability or full vulnerability coverage.
7. **Transparent ingestion policies:** preview redaction/filter effects, policy version and counts, explicit exceptions, reversible rollout where possible. Preserve required evidence and measure detection impact before dropping logs. Default to observe-only for proposed filters; a reduction in volume is not proof of reduced alert noise or retained coverage.
8. **Retention and operational evidence:** scheduled retention with holds, redacted reports, searchable audit and bounded archives only after cost/access/deletion requirements are reviewed. Show ingest gaps, detector failures, backup freshness and restore evidence rather than a fabricated security-health percentage.
9. **Approved response integrations, later:** incident-specific allowlisted actions with separate permissions, explicit authorization, impact preview, step-up authentication, idempotency, expiry, audit and rollback where possible. Never derive executable commands from logs. No automatic endpoint isolation or account disabling in the initial offering.

## Components and feasibility

Keep the existing React/Hono/PostgreSQL foundation for bounded development. PostgreSQL remains the accepted private foundation; it is not a new high-volume commitment. Follow SEN-209B before selecting OpenSearch/ClickHouse or buying scale infrastructure.

- [OpenTelemetry Collector](https://opentelemetry.io/docs/collector/) is the existing collector candidate. Components have different maturity levels. Pin and review only necessary receivers/processors/exporters, their licenses and advisories. Sentinel currently accepts its own JSON envelope, not OTLP: a collector pipeline requires an explicit tested adapter/receiver contract. Do not suggest an unmodified collector will already connect.
- [Sigma](https://sigmahq.io/docs/guide/about.html) separates format, tooling and rule collections. Evaluate a bounded translation subset against actual source mappings. Evaluate code/tool/content licenses separately before importing or redistributing anything; do not promise every Sigma rule works.
- [Microsoft Graph sign-ins](https://learn.microsoft.com/en-us/graph/api/signin-list?view=graph-rest-1.0) exposes paginated, retention-limited events and documents AuditLog.Read.All. Implement checkpointing, overlap/deduplication, throttling and revocation; report missing permissions/fields as degraded. Validate endpoint-specific licensing, admin consent and cloud support before offering the integration. A free Sentinel license does not remove upstream product costs.
- [Graph security APIs](https://learn.microsoft.com/en-us/graph/api/resources/security-api-overview?view=graph-rest-1.0) are a candidate for importing existing incident/alert context. Endpoint permissions, schemas and entitlements need separate verification before implementation.

No dependency, marketplace skill, source connector or external service was installed/configured by this research. New packages require maintenance/runtime/license/advisory review at selection time.

## Commercial release gates

Use existing SEN-208A/B/C/D, SEN-209A/B/C, SEN-210 and SEN-212; do not create a parallel definition of readiness. Evidence must cover supported source outages/replay, migration/rollback, measured capacity and recovery, privacy/retention/deletion, secret rotation, attributable access, tenancy boundaries and independent assessment. Preserve the chosen ASVS baseline. Hosted real telemetry additionally requires approved data locations/subprocessors, service operations, cost bounds and qualified contractual/privacy review. This note is not POPIA, government, Cisco or other certification evidence.

Business model proposal: retain the Apache-2.0 core and essential security controls; optional paid hosting, support and deployment assistance fund operations. Ongoing free hosting needs explicit quotas and a funded cost model. A 24/7 response promise additionally requires staff/partner coverage, escalation ownership and defined contractual service levels. No price or response-time promise is selected here.

## Delivery sequence

1. Complete private access/operations gates and one reliable source-to-case synthetic workflow.
2. Make case timelines/reports and source health useful; add correlation and observable notification delivery.
3. Add one authorized read-only identity integration and validate a narrow pilot after its privacy/security gates.
4. Benchmark supported capacities and recovery, obtain independent review, then approve a bounded commercial offering.
5. Expand sources, posture and approved response only from measured pilot feedback.

Buildable tickets and evidence: `docs/tickets/BUILD-BATCH-010.md`. This sequence is a proposal, not a fixed schedule. Keep [[../07-Decisions/Decision Register]] unchanged until an actual architecture/product decision is accepted.
