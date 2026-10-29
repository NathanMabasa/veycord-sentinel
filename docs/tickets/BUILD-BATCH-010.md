# Build batch010 — Huntress research and proposed commercial roadmap

Date: 2026-10-28. **Research/backlog only. No product changes or commercial release approved.**

Sprint decomposition: [Commercial Sprint Plan](../brain/04-Roadmap/Commercial%20Sprint%20Plan.md) and [Sprint Backlog](SPRINT-BACKLOG.md). Existing SEN-1001–1010 IDs below remain feature epics; the backlog defines child tickets and includes prerequisite SEN-208/209/210/212 work. All child tickets begin in Backlog.

Brain: [[../brain/01-Research/Huntress and Commercial Product Roadmap]]. Preserve existing release gates in `NEXT-RELEASE-GATES.md`; these tickets refine features, not replace the gates. Dependencies are implementation order, not permission to ingest real customer telemetry before approval.

| Ticket | Proposed slice | Dependencies | Acceptance evidence required |
|---|---|---|---|
| SEN-1001 | Collector contract and trustworthy source health | SEN-209A; SEN-208B before multi-user | One reviewed source/collector adapter produces normalized events; server-bound scoped key rotates/revokes; outages, retries, duplicates, malformed input and backpressure measured; UI distinguishes heartbeat/receipt/lag/errors/unknown |
| SEN-1002 | Incident timeline and redacted reports | Existing private cases; SEN-208A/B for individual assignment | Durable evidence timeline preserves event/receipt times and rule revisions; bounded authorized export redacts selected fields, treats stored text as untrusted, logs actor/action; reload, held evidence and reopened case behavior verified |
| SEN-1003 | Correlation and tuning | SEN-209C and1001 | Failures/success correlated by normalized entity and bounded window; late/duplicate events tested; scheduler failure visible; scoped suppression expiry/approval and reviewed rule rollback exercised; no arbitrary rule execution |
| SEN-1004 | Reliable notification delivery | SEN-208B/D and1003 | Configured approved destinations only; egress/SSRF controls; signed delivery, deduplication, retry/backoff/dead letter, redacted payloads and visible delivery status; sending only after explicit configuration |
| SEN-1005 | Entra read-only identity connector | SEN-208A/B/C/D;1001 | Endpoint-specific consent/license matrix; encrypted/revocable credential handling; bounded paging/checkpoint/overlap/dedup and throttling; insufficient scope/data surfaced; synthetic sign-in case with benign negatives. Mailbox/OAuth events separately scoped, never inferred from absent logs |
| SEN-1006 | Inventory and read-only posture |1001;1005 for identity data | Identity/provenance/last-seen displayed; stale/missing data is Unknown; check-specific rationale, read scopes, evidence and drift; no write permissions required for assessment |
| SEN-1007 | Transparent filtering/redaction preview |1001/1003; SEN-208C | Proposed policy begins observe-only; preview and counts, version/audit/owner, protected evidence retention, measured detector impact, controlled rollout; no silent default data loss |
| SEN-1008 | Supported retention, usage and recovery | SEN-208C/D and209B | Scheduled bounded retention/holds and backup expiry coordination; logical versus physical capacity visible; agreed benchmark budget/capacity/RPO/RTO measured; offsite restore drill, cost alarms and operational ownership documented |
| SEN-1009 | Commercial pilot acceptance dossier | SEN-208A/B/C/D,209A/B/C,210,212; selected1001–1008 | Named audience, supported sources/topology/limits, deployment and upgrade rollback, support hours/incident ownership, license inventory/signed release, privacy/subprocessors/terms, independent assessment and approved pilot exit evidence; no blanket compliance/coverage claim |
| SEN-1010 | Approved response actions |1009; separate change-risk review | Allowlisted provider actions only; explicit authorization, independent response scopes, step-up auth, preview, idempotency/expiry, complete audit and exercised recovery where possible. Deferred; no arbitrary remote shell or autonomous destructive actions |

## Suggested first build slice

SEN-1001 plus a minimal SEN-1002 gives a useful demonstration: a synthetic authentication event travels from a maintained collector through the private API into a durable investigation timeline/report, with source gaps visible. Resolve existing access/security prerequisites for the chosen deployment before opening it to users. Avoid a second dashboard backed by fabricated metrics.

## Research evidence and limits

Reviewed Huntress public platform, SIEM, ITDR, EDR and ISPM pages, Microsoft Graph sign-in/security API documentation, OpenTelemetry Collector documentation and Sigma ecosystem documentation on2026-10-28. Full source links are in the linked brain note and Source Index. Product claims were not independently benchmarked; authenticated workflows/prices/contracts were not inspected. No application code/dependencies changed and no tests were run for this documentation-only research.
