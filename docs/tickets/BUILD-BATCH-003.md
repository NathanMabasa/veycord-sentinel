# Batch 003 — bounded data operations and recovery

2026-10-24. User requested continued work toward finishing the project. Existing foundation remains single-operator, synthetic-only until rollout gates. Do not treat this batch as corporate identity or production approval.

| Ticket | Scope | Acceptance | Status |
|---|---|---|---|
| SEN-301 | Mobile evidence and sticky header correction | Readable mobile records, every field accessible, tablet keyboard scrolling, real DB browser and viewport screenshot review | Complete locally; evidence below |
| SEN-302 | Enforced workspace event/byte/case limits | Server/database-configured limits, atomic cross-process quota checks, duplicates don't consume twice, safe quota responses, negative tests | Complete locally; evidence below |
| SEN-303 | Data retention procedure | Received-time cutoff, dry run default, explicit apply and trusted workspace scope, preserve case-linked evidence, bounded deletion with audit | Complete locally; evidence below |
| SEN-304 | Append-only operational audit and status UI | Transactional mutation records, no raw events/notes/secrets in audit, runtime no edit/delete, scoped read API, honest single-key actor, responsive UI | Complete locally; evidence below |
| SEN-305 | Encrypted backup and recovery drill | Built-in authenticated encryption, no command-line passwords, strict local private files, authenticate before restore, empty-target guard, isolated synthetic restore evidence | Complete locally; evidence below |
| SEN-307 | Real database activity overview | Bounded 24-hour event histogram, top sources and severity totals from scoped PostgreSQL data; accessible responsive views and API/browser evidence | Complete locally; evidence below |
| SEN-306 | Integrated verification and source-of-truth update | Build, contracts, real PostgreSQL isolation/quota/audit/retention/recovery, browser, no secret leaks, scoped remaining-gate report | Complete locally; evidence below |

| SEN-308 | Public Apache-2.0 alpha source | Reviewed synthetic-only source, working hero link, private vulnerability reporting and actual GitHub CI evidence | Complete source alpha; private reporting enabled, first source push and Linux CI pass recorded in release checklist |

No paid server or public telemetry service is created by this batch. The user authorized GitHub publication and adopted Apache-2.0. Identity/MFA, per-user/workspace roles, collectors, distributed edge limits, external audit anchoring, high-volume benchmark, independent assessment and supported release provenance still require their own gates. Backup tooling is an operator capability, not a backup schedule or offsite storage service.


## Local completion evidence

Primary engineer reviewed the agents' work and integration corrections. Build passes; 33 unit/API/runtime tests, 2 PostgreSQL integration tests (no skips), 55 actual PostgreSQL browser checks, 2 recovery tests, 62 public browser checks and 9 startup checks pass. Configured secret values were absent from the reviewed source and built assets; local private paths are ignored. Npm advisory scan reports zero known advisories at this snapshot. See `docs/audit/BATCH-003-REVIEW.md` and the raw evidence it links. These scoped checks do not establish absence of vulnerabilities.
