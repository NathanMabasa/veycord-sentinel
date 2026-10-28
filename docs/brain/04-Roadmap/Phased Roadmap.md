# Phased Roadmap

For the current commercial feature decomposition, follow [[Commercial Sprint Plan]] and `docs/tickets/SPRINT-BACKLOG.md`. This older roadmap describes broad phases, not a current implementation checklist. The commercial plan explicitly requires identity/MFA and workspace authorization before multi-user access; later SSO options here do not defer that gate. Historical OpenSearch spikes below are proposals; the private PostgreSQL foundation is implemented and the high-volume backend decision remains benchmark-gated.

## Phase 0 — Decide and prove

- Confirm product name/license and initial deployment target.
- Spike OpenSearch Security Analytics setup and resource footprint.
- Complete a thin vertical flow using synthetic Linux auth events: ingest → normalize → search → detection → alert → case.
- Check content licensing and add a sample dataset.

**Exit:** demonstrable end-to-end flow on a laptop; written architecture tradeoffs and resource notes.

## Phase 1 — Portfolio MVP

- Single-node self-hosted lab deployment.
- Guided first-run and sample investigation.
- Linux auth and web access log paths; add Windows path only when stable.
- Search, saved query, starter dashboard, detections, alerts, cases, export.
- RBAC basics, audit events, retention and deletion controls, security docs.
- GitHub releases, docs site/landing page, contribution and disclosure process.

**Exit:** a newcomer can reproduce the demo and understand a detection's evidence and limits.

## Phase 2 — Useful small-team tool

- Additional firewall/network/cloud source connectors.
- Better field mapping and Sigma import with license/provenance handling.
- Detection testing and release pipeline.
- Notifications and integrations, with secrets handling and audit.
- Backup/restore and upgrade support.
- Accessibility, localization foundations, and more learning labs.

## Phase 3 — Operational maturity

- Offline install/update bundles, signed releases, SBOM and attestations.
- SSO/MFA options, more detailed roles, policy configuration.
- Performance/load characterization and data lifecycle automation.
- Multi-node architecture only if user demand and maintainership justify it.
- Independent security assessment and documented remediation.

## Phase 4 — Response capabilities (gate required)

Consider manual, human-approved response integrations only after authorization, audit, idempotency, rollback, least privilege, and failure-mode design are reviewed. Firewall changes are not an MVP feature.
