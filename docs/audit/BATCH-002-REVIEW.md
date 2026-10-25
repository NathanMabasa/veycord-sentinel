# Batch 002 review

Review date: 2026-10-24. Scope: private database workspace foundation, vulnerability response procedure and hosting decision. This is an implementation review, not an independent penetration test, OWASP certification, or approval for real telemetry.

## Agent review and integration corrections

Three bounded agents implemented the PostgreSQL adapter/schema/setup, private API/validation/tests, and private workspace UI. The primary reviewed the shared DataStore contract, route wiring, runtime configuration, database-role/TLS behavior, API error boundaries and actual UI integration.

Corrections found during integration:

- Kept event pagination's exact from/to range stable across pages because the database cursor binds the query filters.
- Allowed empty initial case notes to match the UI's optional field.
- Aligned API event/user/outcome lengths with the storage contract; normalized accepted timestamps to ISO milliseconds before storage.
- Mapped store input and scoped missing-reference errors to safe 400/404 responses, without exposing SQL/internal details.
- Separated public pages, demo console and brand component from the former 2,475-line App module; routing now stays small. This is maintainability work, not a claim of lower bundle size. Legacy global CSS remains a future cleanup item.
- Ensured a single page main/heading structure in the private route and an accessible search label.
- Fixed the private summary open-case count after case close/reopen; persistence already worked but the visible count was stale.

## Evidence

Final commands and retained evidence are recorded in the ticket batch and final section below. The real database test creates a new temporary password-protected PostgreSQL cluster on a free loopback port, runs the actual bootstrap/migrate/seed CLIs, and removes the cluster afterward. It does not connect to an existing user database. Browser integration, when enabled, runs the built standalone Node server against that disposable database, with an ephemeral generated service key and only synthetic fixtures. Mock UI checks are supplementary and do not substitute for that flow.

## Residual risks / deferred gates

Single configured operator/workspace; no interactive identity, MFA, per-user roles or audit attribution. RLS protects scoped application queries but the runtime database credential can set a custom scope if given arbitrary SQL access. Shared service key cannot authorize different operator roles. No implemented retention/deletion, storage quotas, collector fleet, durable queue/scheduler, high-volume search benchmark, backup/restore automation, HA or production deployment. Process-local rate limits reset on restart; edge abuse and total storage need separate controls. Text search scans within a time range and has a statement timeout; capacity is not proven. Database role is explicitly named sentinel_app, so a hosted provider must support provisioning it separately from the migration owner.

Dependency audit is a point-in-time check; it cannot establish vulnerability absence. Project license/public repository, notices/SBOM/release signing and independent security review remain release work. No remote skill, third-party detection rule pack or arbitrary payload code was installed/executed.

## Final results

Build passes. 28 unit/API/detection/gateway checks pass. 2 PostgreSQL tests pass without skips, including the built standalone server + real-database Playwright flow. See `private-browser-results.json` for individual browser checks: authentication, empty state, 8 events/5 findings, details, optional-note case creation, note save/close/reconnect, filtering, 63-event pagination, memory-only credentials, disconnect and mobile overflow. 62 pre-existing browser checks and 8 startup checks also pass. `npm audit` reports 0 known vulnerabilities at this snapshot; configured database/API secrets are absent from all 8 generated distribution files. Agent mock responsive evidence is separately labeled in `private-ui.md`. Primary inspected desktop and mobile UI screenshots.

The primary additionally configured a local loopback-only PostgreSQL instance with generated owner-only credentials and synthetic seed data, enabled the private gateway, and checked anonymous private requests return401 on both5173 and8787 while public health remains200. No cloud deployment or paid resource was created.
