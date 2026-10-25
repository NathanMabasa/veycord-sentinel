# Batch 002 — private database workspace and security operations

Date: 2026-10-24. Public source and private databases use the same product. Schemas, migrations and synthetic tests are shareable; credentials, telemetry, case data, dumps and database volumes are private. No server purchase or live data migration is authorized by this plan.

| Ticket | Priority | Scope | Status | Acceptance |
|---|---|---|---|---|
| SEN-201 | P1 | Hosting/database decision and open-source deployment model | Complete for local foundation | Current primary-source prices, limits, region tradeoffs, realistic recommendation; no unsupported scale claims |
| SEN-202 | P0 | Vulnerability triage manual for web advisories and untrusted content | Complete for local foundation | Trusted sources, applicability/KEV/EPSS triage, safe remediation, evidence, rollback, disclosure and prompt-injection handling |
| SEN-203 | P1 | PostgreSQL schema, migrations, least privilege and scoped store | Complete for local foundation | Real PostgreSQL integration; parameterized queries, RLS, non-owner runtime, idempotent ingest, no committed customer data |
| SEN-204 | P1 | Private service API with scoped credential and bounded validation | Complete for local foundation | Default disabled; no credential defaults; one trusted configured workspace; safe errors, input/rate bounds and tests |
| SEN-205 | P1 | Database-backed private workspace UI | Complete for local foundation | Token memory only, real loading/error/empty states, summary/events/findings/cases, no demo fallback into private data |
| SEN-206 | P1 | Curated deterministic detection engine | Complete for local foundation | Authored, documented rules; positive/negative tests; evidence and ATT&CK mapping; no arbitrary execution or universal detection claims |
| SEN-207 | P1 | Code reduction, security sweep and integration evidence | Complete for local foundation | Split a coherent module, avoid duplicate behavior, build/contracts/browser/DB checks, honest gap report |
| SEN-208 | P0 before corporate multi-user rollout | Managed identity, user roles, audit/export/deletion, distributed quotas, operational recovery | Pending | Strong identity, per-user permissions, cross-workspace tests, privacy/retention review, recovery drill, independent assessment |
| SEN-209 | P1 before sustained SIEM volume | Search engine benchmark and detector scheduling | Pending | Representative ingest/query/detection performance, coverage/false positives, storage economics, safe rollout |

This batch builds a single-operator private workspace foundation. A scoped service credential is not interactive user identity or a corporate RBAC system. High-volume log storage remains a measured architecture decision; PostgreSQL is the portable first metadata and bounded-event store. The public synthetic demo remains available separately and never reads private tables.

Budget: check usage between phases and stop before 10% remains. If unfinished, save exact state and schedule the user-authorized continuation after the reported reset.

## Acceptance evidence (2026-10-24)

- SEN-201: [[../brain/02-Architecture/Private Deployment Decision]] records dated primary-source hosting prices, SA vs offshore tradeoffs, PostgreSQL choice and high-volume benchmark gates. No server purchase.
- SEN-202: [[../brain/03-Security/Vulnerability Response Manual]] covers untrusted web content, inventory/applicability, KEV/EPSS, safe patching, evidence and rollback.
- SEN-203–205: `npm run build` passes; `SENTINEL_BROWSER_AUDIT=true npm run test:db` passes 2/2 actual PostgreSQL tests plus the private browser checks in `docs/audit/private-browser-results.json`. Disposable database bootstrap/migration/seed, isolation, deduplication, event cursor paging, linked cases and real UI persistence verified. UI mock tests supplement actual DB integration at 768/390/360 px.
- SEN-206: six authored deterministic rules have positive/negative/evidence fixtures and documented coverage/false positives; eight UI samples produce five findings. No universal detection claim.
- SEN-207: 28 unit/API/detection/gateway tests, 62 existing browser checks, 8 startup checks; no browser exceptions; npm audit reports 0 known advisories at this check. Secrets absent from built assets (8 built files); `.env` mode0600 and `.data` excluded by ignore configuration. This is a scoped sweep, not proof of bug absence. App/module separation is maintainability work; global CSS and bundle work remain pending.

Evidence: `docs/audit/BATCH-002-REVIEW.md`, `unit-tests-batch002.txt`, `database-tests-batch002.txt`, `private-browser-results.json`, `browser-results.json`, `bootstrap-results.json`, `dependency-audit-batch002.json`, `private-config-check.json`, and screenshots.

A persistent **local synthetic-only** PostgreSQL instance is configured in ignored `.data/postgres` on loopback54329; private generated credentials are in owner-only `.env`. Private workspace is enabled on Vite5173 and standalone Node8787. Nothing was deployed to a cloud provider or public GitHub. Follow `docs/PRIVATE-WORKSPACE.md` for lifecycle/access instructions.

SEN-208/209 remain pending and are decomposed in `NEXT-RELEASE-GATES.md`. No corporate, government, POPIA/OWASP compliance or production-readiness claim is made.

### Visual review correction at budget pause

SEN-205 is **reopened for mobile presentation**: actual screenshot shows crowded/overlapping event table text even though page-overflow checks pass. Fix the layout and inspect the sticky header; add stronger checks and review screenshots before closing. Functional private database workflows and16 private browser assertions passed. Usage check reached7% remaining; pause and resume after reset. See HANDOFF.md. Other completion statements above are scoped to tested behavior, not visual perfection.


### Batch003 resolution

SEN-205's mobile presentation correction is closed by SEN-301: readable semantic cards at 320/360/390px, contained keyboard-scrollable tablet table and actual sticky-header viewport inspection. See `BATCH-003-REVIEW.md` and the current real-PostgreSQL browser evidence. Earlier failed screenshots/logs are historical regression evidence.
