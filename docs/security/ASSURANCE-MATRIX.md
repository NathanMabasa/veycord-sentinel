# Security assurance evidence ledger

Reviewed 2026-10-25. Scope: early single-operator Node/Hono/PostgreSQL alpha plus separate synthetic browser demo. Engineering owners are the project maintainers; an independent assessor is not appointed. Planning target: OWASP ASVS 5.0 Level 2; this table groups engineering concerns and does not claim complete requirement-level mapping or certification.

| Concern | Current control/evidence | Status and remaining gate |
|---|---|---|
| Threat model and secure defaults | Brain Threat Model Starter; private API disabled by default; loopback runtime default | Documented/local implementation; reassess for hosted identity/collectors |
| Authentication | Server-configured random bearer key, request denial and secret-safe errors, private-api tests | Verified locally for shared operator only; maintained identity/MFA/session/revocation pending |
| Authorization | Server-configured workspace, parameterized scoped store, forced RLS, composite FKs, disposable PostgreSQL denial tests | Verified local scope; DB credential holder can alter workspace context. Multi-user tenant membership/roles missing |
| Input/query/resource bounds | Bounded flat event schema, UTF-8 raw/attribute bounds, max batches, fixed query fields, time windows/cursors, statement timeout, logical event/byte/case/audit capacities | Unit/API/actual PG checks; distributed abuse limits, physical disk alarms and sustained-volume validation pending |
| Data confidentiality | Runtime-only private environment, no browser credential persistence, verified remote DB TLS, no secret values in reviewed builds/source | Local plaintext only behind explicit loopback flag; deployment TLS, at-rest storage/key management and real-data review pending |
| Audit/integrity | Transactional allowlisted mutation audit, runtime no update/delete, same-workspace mutation serialization | Actual PostgreSQL/browser evidence; shared actor, administrator tampering and forged inserts remain risks. Individual/external/denial/export audit pending |
| Retention/privacy | Received-time administrator dry-run/apply with bounded deletion and all-case holds | Verified local behavior; redaction, subject export/delete, scheduled cleanup and backup expiry pending |
| Recovery | AES-256-GCM envelope, separate key, bounded archive, authenticated-before-restore, empty target, known migrations and restricted grants | Actual isolated synthetic recovery drill passes; offsite/schedule/RPO/RTO/key escrow pending |
| Dependency provenance | Lockfile, THIRD_PARTY_NOTICES, full available notices, SBOM and npm advisory checks | Advisory snapshot zero known findings; updates require review; GSAP separate Standard terms |
| Code review and tests | Batch005 changed-layer build, 36 unit/API, 2 PG, 2 recovery and 63 private browser checks; batch004 public UI/startup/accessibility evidence retained | Local evidence in batch003/004 review and batch005 tickets. Protected PR CI is authoritative for each final revision; no independent assessment implied |
| Static analysis | SHA-pinned CodeQL JS/TS security-extended workflow and a tested high/critical SARIF gate | Actual GitHub scan at 6821b0d passed; zero open alerts after fixing two production input path races and restructuring test-only identity assertions. Future findings require review; no assurance of vulnerability absence |
| Source secret protection | GitHub repository secret scanning and push protection enabled; configured-secret scan before first push | Platform settings verified; does not recognize every possible private value; manual source/data review still required |
| Build/source release | Public Apache-2.0 source, read-only CI permissions, pinned official actions, Dependabot PRs; strict verify/CodeQL required on protected main including admins | PR9 merged at b76b279; Linux verify40167750167 and CodeQL40167750153 passed. New revisions require their own checks. Signed release provenance and supported release policy remain pending |
| Vulnerability handling | Private GitHub advisory reporting enabled, SECURITY.md and response manual | No supported production version/response SLA yet; maintainer triage and patch/retest needed |
| Independent assurance | No certificate or external assessment obtained | Cisco/IEC/ASVS/POPIA/government claims prohibited without relevant scope and evidence |

Evidence changes must update this ledger, the relevant ticket and decision note. Raw customer data, secrets and sensitive vulnerability details never belong in this public ledger.
