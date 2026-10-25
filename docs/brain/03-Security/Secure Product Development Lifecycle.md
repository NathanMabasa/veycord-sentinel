# Secure Product Development Lifecycle

## Purpose

Set an evidence-based security lifecycle for Veycord Sentinel. Cisco's Secure Development Lifecycle is a maturity reference for how an organization can integrate security throughout planning, development, validation, release, operation, and monitoring. This project borrows lifecycle principles; it does not claim Cisco-level security, Cisco certification, or equivalent assurance.

## Principles to translate

- Security and privacy requirements are written during planning, tied to product features, and checked at release gates.
- Threat models follow data flows across trust boundaries and name threat actors, abuse cases, mitigations, owners, and residual risk.
- Secure defaults and least privilege reduce the burden on operators. Dangerous operations require explicit, reviewable authorization.
- Third-party components, source, build systems, release artifacts, and update paths need inventory and integrity controls.
- Verification combines code review, automated analysis, tests, adversarial testing, and independent review appropriate to risk.
- Operational security includes vulnerability intake, response targets, advisories, supported-version policy, and end of life.
- Evidence is attached to each requirement: owner, control, validation method, result, artifact, and date.

## Lifecycle gates

| Phase | Minimum evidence before proceeding |
|---|---|
| Plan | Data-flow diagram; threat model; privacy and data inventory; attack surface; requirements; abuse cases; secure defaults; unresolved risk owner |
| Develop | Peer review; protected branches; secret scanning; SAST; dependency inventory; pinned/reviewed dependencies; parser/query limits; authorization checks |
| Validate | Unit/integration/contract tests; DAST on deployed preview; parser fuzz/property tests; cross-tenant tests; dependency and container scans; backup/restore drill for persistence |
| Release | Release checklist; SBOM; provenance/signatures where supported; vulnerability disposition; secure configuration; migration/rollback plan; signed release notes; support window |
| Operate | Hardened deployment guide; key rotation; access review; audit policy; incident response and recovery procedures; safe logs; retention and deletion verification |
| Monitor | Security contact and coordinated disclosure process; triage/patch SLAs; advisories; dependency monitoring; end-of-life communication; post-incident corrective actions |

## Gate definitions and evidence repository

Each release should have a versioned assurance record under `docs/security/releases/<version>/` containing the threat-model revision, checklist results, software bill of materials, scan summaries, test evidence, accepted risks with owner/expiry, known limitations, and release approval. Never store secrets, customer logs, exploit payloads containing real identifiers, or unredacted sensitive vulnerability details in public records.

A control is **implemented** only when code/configuration exists. It is **verified** only when a repeatable check has passed and evidence is recorded. A roadmap item or policy statement is not evidence of an implemented control.

## Initial release gates for Sentinel

Do not accept hosted real telemetry until all of the following have evidence:

1. Authentication, workspace membership, server-side authorization, and cross-workspace denial tests across search, alerts, cases, ingestion, exports, queues, and background jobs.
2. Schema-validated and resource-bounded ingest, parser hardening, query limits, rate controls, replay/idempotency behavior, and dead-letter handling.
3. Encryption and key-management design; minimization/redaction policy; retention, export, and deletion behavior; POPIA/privacy review; residency and subprocessor disclosure.
4. Audit records for privileged/security-relevant actions, without copying sensitive payloads into general logs.
5. Build provenance, dependency inventory/SBOM, secret scanning, SAST, dependency/container scans, tested backups/restores, and operational/incident procedures.
6. Independent penetration test and remediation of critical/high findings, plus an explicit exception process with expiry and accountable owner.

## Maturity language

Use precise status labels: `implemented`, `verified`, `planned`, `not applicable`, or `accepted risk`. Do not market “Cisco-level”, “government-grade”, “POPIA-compliant”, or equivalent claims without a defined scope, assessment, and evidence. Target practices should be presented as a roadmap until verified.

## References

- [Cisco Secure Development Lifecycle overview and hardening guidance](https://www.cisco.com/c/en/us/products/collateral/servers-unified-computing/compute-security-hardening-guide-standalone-wp.html)
- [Cisco on continuous security assurance](https://blogs.cisco.com/security/always-on-assurance)
- [Cisco security, privacy, and trust approach](https://www.cisco.com/c/m/en_us/about/purpose/reporting-hub/responsible-innovation/spt.html)
- [[Security Requirements]] · [[Threat Model Starter]] · [[Build Map and Traceability]]
