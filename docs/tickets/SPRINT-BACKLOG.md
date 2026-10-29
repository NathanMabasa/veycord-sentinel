# Commercial sprint backlog

Baseline2026-10-28. Tickets start in **Backlog** unless the execution record below says otherwise; implementation estimates remain unset. They are Markdown tickets, not GitHub Issues. Sprint labels indicate sequence, not committed dates. Cadence, scope, review and release rules: [Commercial Sprint Plan](../brain/04-Roadmap/Commercial%20Sprint%20Plan.md).

P0 = prerequisite/release boundary; P1 = initial product capability; P2 = later expansion. Every ticket also follows the plan's shared definition of done. Parent links refer to existing feature epics/gates; no existing ticket is renumbered or automatically completed.

## Active execution — 2026-10-28

Owner authorized beginning the updates. Codex owns the current implementation work. [Sprint0 execution](../brain/04-Roadmap/Sprint%200%20Execution.md) records working scope, historical evidence and proposed measurement budgets. SEN-1009-A and C remain **In review** pending scope/target agreement. SEN-1009-B is **Done** after protected PR14 merged with final-head checks. SEN-208A-1 is **Done** for selection/design after protected PR15 merged at2400b0a20fdb598f4af376064093a3de9464d1c8; see the [identity selection](../brain/02-Architecture/Identity%20Provider%20Decision.md); auth installation/flows in the application are not complete. Other tickets remain Backlog. No readiness gate is completed by this record.

## Sprint0 — Scope and baseline

### SEN-1009-A — Agree the first supported product [P0]

- Parent: SEN-1009. Dependencies: none. Owner input required before Done.
- Scope: choose initial user, source, deployment topology, supported actions, exclusions and support expectations; propose Linux-auth/private single-node first.
- Accept: a reviewed scope matrix distinguishes public demo, private pilot and optional future hosting; unknowns have decision owners; no claim of all-threat coverage or24/7 support.

### SEN-1009-B — Reconcile release evidence [P0]

- Parent: SEN-1009. Depends:1009-A.
- Scope: map shipped work, including batch009 live evidence, against remaining gates and this backlog; preserve local/uncommitted evidence through a protected documentation PR.
- Accept: every gate has current status, reproducible artifact/commit reference or named missing evidence; historical checks cannot stand in for final-head checks.

### SEN-1009-C — Define measurable acceptance budgets [P0]

- Parent: SEN-1009/SEN-209B. Depends:1009-A.
- Scope: define representative synthetic workload, event sizes/source count, retention, sustained/burst load, p95 latency, resource/cost envelope, recovery-point/time objectives and notification expectations.
- Accept: numbers and environment are explicitly agreed before benchmark execution; targets are labeled targets and have pass/fail measurement procedures. No invented capacity claim.

## Sprint1 — Identity and permissions

### SEN-208A-1 — Select and document maintained identity [P0]

- Execution2026-10-29: **Done** for selection/design, owner Codex. Self-managed Better Auth selected for the private Node/PostgreSQL implementation; current managed MFA limitation and Keycloak alternative documented. Installed isolated1.7.14 plugin, license, engine and35-package audit inspection recorded in `docs/audit/identity-selection-dependencies.json`. No application dependency/database/authentication change or runtime tests yet. Review: https://github.com/NathanMabasa/veycord-sentinel/pull/15 . Final head7e25d5172ecf9ecfe25b8f56d4ed89bf57e2fc64 passed verify40836629970 and CodeQL40836629946, then protected-squash merged to2400b0a20fdb598f4af376064093a3de9464d1c8. Application authentication in208A-2/B remains separate and incomplete.

- Parent: SEN-208A. Depends:1009-A.
- Scope: compare candidates against runtime, self-host/hosted path, MFA/recovery, residency, license and operating cost; document session/data flows and migration from shared operator access.
- Accept: reviewed decision and threat model; required account/provider inputs identified; no custom password system or fabricated sign-in.

### SEN-208A-2 — Implement session and MFA lifecycle [P0]

- **In review**, Codex, batch011 / draft PR16. Private account/MFA implementation has reproducible disposable-PostgreSQL and real-browser regression coverage, including recovery reuse/concurrency, revocation, expiry and negative access. Source head a69366f passed required verify40929488686 and CodeQL40929488279, including the new Linux identity/browser step. Independent review remains open; production hosting/proxy/operations are deferred. Later PR heads must still pass required CI. See BUILD-BATCH-011.md.

- Parent: SEN-208A. Depends:208A-1 and provider configuration.
- Scope: login/logout, secure session handling, MFA, recovery and revocation, with understandable degraded/error states.
- Accept: appropriate integration evidence covers session expiry/revocation, recovery and rejected requests; CSRF/session protections follow the chosen architecture; secrets never enter client bundles/logs.

### SEN-208B-1 — Enforce workspace membership and roles [P0]

- **Partial / In review** for one fixed workspace in batch011. Three roles, stale-session revocation, encoded-route rejection and foreign-workspace membership negatives are covered. Hosted/multiple-workspace lifecycle and future jobs/exports remain open.

- Parent: SEN-208B. Depends:208A-2.
- Scope: admin/analyst/viewer/service boundaries and membership lifecycle; server-derived identity/workspace across existing APIs and future jobs/exports; invalidate removed access.
- Accept: an authorization matrix and cross-role/workspace denial evidence cover every implemented operation, including stale sessions; RLS remains defense in depth, not the sole authorization layer.

### SEN-208B-2 — Attribute security-relevant actions [P0]

- **Partial / In review** in batch011. Concurrent user mutations retain server-derived actors; identity audit is append-only for its runtime role and permission denials are recorded. External anchoring and additional event families remain open.

- Parent: SEN-208B/D. Depends:208B-1.
- Scope: record actual user/service actor, membership/access changes and appropriate denied access without logging credentials or raw sensitive payloads.
- Accept: attributable bounded audit entries survive reload; ordinary actors cannot edit/delete them; administrator/external anchoring limitations documented. Extend event coverage as later features ship.

## Sprint2 — Collection and source health

### SEN-1001-A — Version one collector/source contract [P1]

- Parent: SEN-1001/SEN-209A. Depends:1009-A/C.
- Scope: evaluate one maintained collector/component; define JSON/OTLP adaptation, mapping, event identity, timestamps, parser version and error quarantine.
- Accept: pinned component/license/runtime/advisory review and synthetic valid/malformed fixtures; explicit adapter design, no claim current JSON API accepts OTLP unchanged.

### SEN-1001-B — Add source-scoped credential lifecycle [P0]

- Parent: SEN-1001. Depends:208B-1/2,1001-A.
- Scope: least-privilege ingest credentials, server-bound source/workspace, safe issuance, rotation and revocation; no reuse of the shared operator key for collectors.
- Accept: key disclosure only through approved setup; credentials cannot read cases/change workspace/source; revoked/expired credentials and payload-scope spoofing fail safely; key material excluded from audit/logs.

### SEN-1001-C — Deliver through outages and overload [P1]

- Parent: SEN-1001. Depends:1001-A/B.
- Scope: maintained collector adapter, bounded buffering/retries, durable acknowledgement contract, deduplication, parser quarantine and backpressure.
- Accept: synthetic end-to-end records stored/searchable; interruption/replay/duplicate/rejection behavior measured against1009-C; no silent loss or unbounded queue growth.

### SEN-1001-D — Display actual source health [P1]

- Parent: SEN-1001. Depends:1001-C.
- Scope: source enrollment/configuration guide plus observed heartbeat, latest event receipt, lag, counts and failures.
- Accept: disconnected, idle, stale, malformed and unknown states demonstrated from real pipeline state; onboarding verifies a stored synthetic record; accessible responsive UI, no fabricated connected badge.

## Sprint3 — Investigations and reports

### SEN-1002-A — Persist case timeline and evidence [P1]

- Parent: SEN-1002. Depends:208B-1/2,1001-C.
- Scope: chronological event/action timeline with event and receipt times, evidence references and historical rule revision.
- Accept: reload, late events, missing referenced evidence and retention holds preserve an understandable narrative; unauthorized evidence linking is rejected; stored payloads render as untrusted text.

### SEN-1002-B — Assign and review cases [P1]

- Parent: SEN-1002. Depends:1002-A.
- Scope: authorized assignee, status/disposition, remediation checklist, notes and reopening; handle concurrent edits.
- Accept: changes persist with actor audit; membership restrictions enforced; stale updates cannot silently overwrite another analyst; keyboard/mobile/light/dark workflows reviewed.

### SEN-1002-C — Export a redacted incident report [P1]

- Parent: SEN-1002. Depends:1002-A/B,208B-1/2.
- Scope: bounded authorized export with source/time/evidence, selected redaction and clear observed fact versus analyst interpretation.
- Accept: cross-workspace export denial, field-redaction and export-audit evidence; no secrets or executable stored markup in report; defined format/provenance and missing-evidence behavior. This is not subject-level privacy export completion.

## Sprint4 — Detection operations

### SEN-1003-A — Add bounded windowed correlation [P1]

- Parent: SEN-1003/SEN-209C. Depends:1001-C,1009-C.
- Scope: one normalized authentication sequence, explicit entity/window, duplicate/late-event semantics and alert evidence.
- Accept: malicious/benign/boundary/out-of-order fixtures, cross-workspace isolation and bounded query/resource evidence; a match is labeled a review lead, not confirmed compromise.

### SEN-1003-B — Make scheduler and rule rollback observable [P0]

- Parent: SEN-1003. Depends:1003-A.
- Scope: durable scheduling/checkpoints, bounded historical registry, revision deployment/review and rollback.
- Accept: restart/concurrent worker/replay behavior specified and verified; failure/lag visible; rollback exercised without rewriting historical evidence or executing rule payload code.

### SEN-1003-C — Support scoped, expiring tuning [P1]

- Parent: SEN-1003. Depends:1003-B,208B-1/2.
- Scope: suppression owner, reason, scope, expiry and review; disposition feedback.
- Accept: access/expiry tests and before/after fixture results show exactly which alerts are suppressed; original evidence remains inspectable; rule/source mapping gaps remain visible.

## Sprint5 — Notifications and transparent data policies

### SEN-1004-A — Build bounded signed webhook delivery [P1]

- Parent: SEN-1004. Depends:1003-B,208B-1/2.
- Scope: explicitly configured approved test destinations, redacted signed payload, outbox/retry/backoff, deduplication and dead-letter state.
- Accept: egress/SSRF protections cover DNS/redirect/private-address bypasses; replay/signature and outage evidence; no destinations contacted until authorized configuration. No generic user-supplied fetch proxy.

### SEN-1004-B — Expose routing and delivery failures [P1]

- Parent: SEN-1004. Depends:1004-A.
- Scope: severity routing, delivery attempts, acknowledgement and explicit escalation policy.
- Accept: approved test receiver demonstrates retry, duplicate avoidance and failed-delivery UI; route edits are role-controlled/audited; notification timing measured rather than promised.

### SEN-1007-A — Preview filtering and redaction [P1]

- Parent: SEN-1007. Depends:1001-C,1003-C; privacy design from208C.
- Scope: observe-only policy simulation, selected fields/event classes, version and matched/retained counts.
- Accept: no input is silently dropped by preview; examples use synthetic data; protected evidence and missing telemetry warnings remain clear; preview workloads bounded.

### SEN-1007-B — Review policy effects and controlled rollout [P0]

- Parent: SEN-1007. Depends:1007-A,208B-1/2.
- Scope: review/approval, detector-impact comparison, rollout/disable semantics and audit. Keep observe-only if evidence does not justify enforcement.
- Accept: regression fixtures document retained coverage and known loss; previously discarded input cannot be advertised as recoverable; held evidence and privacy requirements respected.

## Sprint6 — Privacy, capacity and recovery

### SEN-208C-1 — Implement subject data lifecycle [P0]

- Parent: SEN-208C. Depends:208B-1/2; extends1002-C.
- Scope: data inventory/classification, authorized subject redaction/export/deletion, holds and backup-expiry coordination, including audit/identity/connector records.
- Accept: synthetic lifecycle proof covers all stores and denied requests; retention/legal exceptions and backup re-deletion behavior documented and reviewed; no compliance claim from implementation alone.

### SEN-208C-2 — Enforce service-wide resource bounds [P0]

- Parent: SEN-208C. Depends:1001-C,1009-C.
- Scope: distributed rate/concurrency limits, non-idempotent mutation handling, physical storage monitoring and explicit overload responses.
- Accept: multi-process synthetic abuse/retry exercises cannot bypass limits or exhaust unbounded resources; logical quota versus disk limits clear; secrets/tenants remain isolated under errors.

### SEN-1008-A — Schedule retention and protected recovery [P0]

- Parent: SEN-1008/SEN-208D. Depends:208C-1/2.
- Scope: scheduled bounded retention/holds, encrypted scheduled offsite backup, key ownership/rotation, expiry and alerting; externally anchored security audit per reviewed design.
- Accept: failed jobs visible; synthetic offsite restore and key-recovery drill measured against1009-C; audit integrity/administrator limitations documented; deletion/backup expiry coordinated.

### SEN-1008-B — Benchmark the supported data plane [P0]

- Parent: SEN-1008/SEN-209B. Depends:1001-C,1003-B,1009-C.
- Scope: compare PostgreSQL with a selected search candidate on the same licensed synthetic workload, including query/detection/ingest and recovery/cost behavior.
- Accept: reproducible environment/results, sustained/burst/error metrics and p95/resource/cost evidence; documented keep/change decision. A failing budget causes scope/architecture revision, not an unsupported scale claim.

### SEN-1008-C — Publish truthful operations health [P1]

- Parent: SEN-1008. Depends:1008-A/B,208C-2.
- Scope: visible pipeline/detector/notification failures, storage/cost alerts, backup freshness and restore evidence; runbooks and named incident ownership.
- Accept: injected failures route to approved test destinations and actionable UI; no invented global security score; dashboard honors role/workspace boundaries and supports keyboard/themes/mobile.

## Sprint7 — Entra monitoring and inventory

### SEN-1005-A — Define read-only provider access [P0]

- Parent: SEN-1005. Depends:208A/B/C/D,1001-A; requires authorized test tenant/provider setup.
- Scope: sign-in/audit endpoint contract, scopes/admin consent, entitlements, regional support and credential lifecycle. Mailbox/OAuth sources are separate follow-ups.
- Accept: reviewed capability/permission/license matrix and revocation plan; no write scope requested for monitoring; absent permission/data is explicitly unsupported/degraded.

### SEN-1005-B — Ingest with checkpoint and throttling safety [P1]

- Parent: SEN-1005. Depends:1005-A,1001-B/C.
- Scope: encrypted provider credentials, bounded pagination, checkpoint/overlap/dedup, throttling/backoff and revocation.
- Accept: synthetic/provider-mock outage/restart/throttle evidence and consented test-tenant verification where available; tokens never reach clients/logs; no real tenant access assumed by this ticket.

### SEN-1005-C — Explain one identity investigation [P1]

- Parent: SEN-1005. Depends:1005-B,1002/1003 slices.
- Scope: one documented identity detection using available sign-in/audit fields and linked timeline/report.
- Accept: benign/VPN/missing-field negatives and source freshness visible; no inference of session theft from location alone; original provider provenance preserved.

### SEN-1006-A — Show source-derived inventory [P1]

- Parent: SEN-1006. Depends:1001-D,1005-B for identity entities.
- Scope: known hosts/users, source identity, last seen and provenance; conservative entity linking.
- Accept: ambiguous identities do not merge silently; stale/missing telemetry is Unknown; no unsupported vulnerability/health claim; reads/search respect workspace authorization.

## Sprint8 — Supported release and pilot decision

### SEN-210-1 — Produce a reproducible supported release [P0]

- Parent: SEN-210. Depends: selected feature scope,1008-B.
- Scope: version/support matrix, signed/checksummed artifacts, provenance/SBOM/notices, update/rollback and vulnerability triage ownership.
- Accept: clean-install/upgrade/rollback evidence on supported topology; final-head CI and dependency review; self-host instructions work without developer private config; source publication alone is not marked production-ready.

### SEN-212-1 — Complete independent scoped assessment [P0]

- Parent: SEN-212. Depends: stable selected scope and security evidence.
- Scope: ASVS requirement evidence, threat-model abuse cases, independent security/privacy/deployment assessment and qualified legal/residency/procurement review as applicable.
- Accept: assessor scope/independence documented; findings remediated/retested or formally dispositioned by an accountable approver; unresolved launch blockers prevent release. Scheduling/cost require external input.

### SEN-1009-D — Approve and execute a bounded pilot [P0]

- Parent: SEN-1009. Depends: applicable208/209/210/212 gates,210-1/212-1, owner authorization for the selected data/environment.
- Scope: named participants, permitted sources/data, capacity/retention/cost limits, approved terms, support/incident contacts, stop conditions and exit measures.
- Accept: explicit go/no-go before real data; pilot results record failures/detection quality/usability and operational performance; any unmet gate keeps the pilot synthetic or blocked.

### SEN-1009-E — Decide commercial availability [P0]

- Parent: SEN-1009. Depends:1009-D.
- Scope: approve exact supported offering, service hours, pricing/funding and exclusions; decide self-host support versus operated hosting separately.
- Accept: owner-reviewed pilot dossier and ongoing operating ownership; hosted real data requires hosted-specific isolation/privacy/recovery/cost evidence; no automatic24/7 response or certification claim.

## Deferred expansion tickets

| Ticket | Scope | Readiness condition |
|---|---|---|
| SEN-1006-B | Read-only posture checks and drift | Check-specific provider/source/permission validation; no missing-data-as-healthy behavior |
| SEN-1006-C | Report-only change-impact preview | Reviewed baseline/license, affected entities and bounded simulation; no policy changes |
| SEN-1010-A | Allowlisted response integration contract | Initial offering accepted; separate provider permissions and change-risk review |
| SEN-1010-B | Step-up approval, expiry, idempotency and audit |1010-A plus documented recovery/rollback limitations; no arbitrary shell |
| SEN-1010-C | Sandbox response failure/recovery trials |1010-B plus explicit authorized test target; production enablement is a separate decision |

## Ticket completion record

Append to each implemented ticket: accountable owner; status; linked parent/gate; selected sprint; PR/commit; verification commands/results and limits; UI evidence if applicable; security/license impact; migration/rollback; remaining issues. Do not mark Done from a plan, screenshot or unrun test list.
