# Veycord Sentinel Product Brain

An Obsidian-compatible knowledge base for planning an open-source security analytics platform. Start with [[00-Product/Product Thesis]], then follow the linked notes.

## Map

- Product: [[00-Product/Product Thesis]], [[00-Product/Personas and Jobs]], [[00-Product/Scope and Non-Goals]]
- Research: [[01-Research/Market and Product Landscape]], [[01-Research/Competitor Workflow Notes]], [[01-Research/What Makes a Strong Splunk Alternative]], [[01-Research/Free and Open Source Model]], [[01-Research/Detection Content and Data Rights]]
- Architecture: [[02-Architecture/Proposed Architecture]], [[02-Architecture/Component Guide]], [[02-Architecture/Data and Detection Standards]], [[02-Architecture/Data Plane Decision and Benchmark]], [[02-Architecture/Deployment and Cost Model]], [[02-Architecture/Web Hosting Strategy]]
- Security: [[03-Security/Security Requirements]], [[03-Security/POPIA and Government Readiness]], [[03-Security/Threat Model Starter]], [[03-Security/Cisco SDL Alignment and Assessment Path]]
- Optional monitoring research: [[03-Security/Application Error Monitoring]] (deferred; Sentry is currently a product-flow reference)
- Experience: [[05-UX/First Run and Learning Path]], [[05-UX/Information Architecture]], [[05-UX/Visual Design System]]
- Delivery: [[04-Roadmap/Phased Roadmap]], [[06-Operations/Project Operations]], [[09-Engineering/Framework Decision and Research Plan]], [[09-Engineering/Recommended Stack and Libraries]], [[09-Engineering/Build Map and Traceability]], [[09-Engineering/Engineering Skills and Agent Guidance]]
- Decisions: [[07-Decisions/Decision Register]]
- Sources: [[08-References/Source Index]]

## How to use this brain

Treat market findings as dated snapshots, standards as versioned inputs, and product decisions as proposals until accepted. Every implementation requirement should link to a security control, user job, or explicit decision. Revisit the source index before making licensing, legal, or procurement claims.

## Current recommendation

Build an open-source SIEM learning and investigation platform with both self-hosting and an optional, quota-bounded Cloudflare-hosted workspace for real telemetry. Publish source and releases on GitHub, and provide a Cloudflare-hosted landing page and synthetic demo. Hosted real-data service must pass security, privacy, residency, and cost gates. See [[00-Product/Product Thesis]], [[02-Architecture/Web Hosting Strategy]], [[09-Engineering/Build Map and Traceability]], and [[07-Decisions/Decision Register]].

## Current implementation snapshot (2026-10-24)

Public web distribution update (2026-10-28): batch007 adds a database-free Worker deployment for the website, synthetic console and read-only fixture API, with explicit self-hosting guidance in place of the private connection form. See `docs/PUBLIC-WEB.md` and batch007 for the publication record. The private Node/PostgreSQL architecture and real-telemetry gates remain separate.

The public `/demo` and `/api/v1` still use synthetic fixtures. An optional **single-operator private PostgreSQL workspace** now exists at `/workspace` with `/api/private/v1`: server-configured bearer credential/workspace, bounded event ingestion/search, six authored deterministic rules, findings and durable cases. Node.js runs the private gateway; it is disabled by default and is not a deployed Cloudflare Worker. Runtime-role checks, parameterized transactions, forced RLS and composite workspace references are defense in depth; they do not replace multi-user identity or prevent a database credential holder from choosing a workspace setting.

Read [[02-Architecture/Private Deployment Decision]], [[03-Security/Vulnerability Response Manual]], [[03-Security/Detection Coverage]], `docs/PRIVATE-WORKSPACE.md`, `docs/PRIVATE-API.md` and `docs/tickets/BUILD-BATCH-002.md`. Batch 003 adds a local single-operator slice for logical quotas, manual received-time retention, append-only mutation audit, database-backed analytics, and manual encrypted PostgreSQL backup/restore. These do not complete the broader controls: interactive identity/roles, collector deployment, subject-level privacy export/deletion, scheduled retention, external audit anchoring, offsite/scheduled recovery, data-plane benchmarks and independent review remain gates. Use synthetic data until the real-telemetry rollout is approved. The code does not establish OWASP compliance or government readiness.

## Operations implementation update (batch003)

The private foundation now includes real 24-hour event analytics, event time-range filters, logical workspace capacities (including audit), transactional mutation audit, administrator-only limit changes, received-time retention dry run/apply with case holds, and authenticated encrypted local backup/restore with an isolated PostgreSQL recovery drill. The standalone service runs compiled JavaScript with a runtime-only environment file. Read [[02-Architecture/Operational Controls]], `docs/OPERATIONS.md`, `docs/BACKUP-AND-RESTORE.md`, and batch003 tickets. Corporate identity/roles, external audit anchoring, full privacy lifecycle, collection, sustained-volume validation and operational deployment remain open. The owner adopted Apache-2.0; third-party terms remain separate.
