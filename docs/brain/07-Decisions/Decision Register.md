# Decision Register

## Decisions and proposals

| ID | Decision | Proposal | Why | Status |
|---|---|---|---|---|
| D-001 | Product shape | SIEM learning and investigation workbench | Strong portfolio depth and accessible first use | Proposed |
| D-002 | Core license | Apache-2.0 | Permissive, clear self-hosting and reuse | Accepted by owner 2026-10-24; root LICENSE/package metadata adopted. Third-party rights/notices remain separate. |
| D-003 | Storage/search | Prototype OpenSearch-backed approach first | Reuse open engine and Security Analytics patterns | Proposed; validate resource cost |
| D-004 | GitHub | Public source of truth | Issues, releases, docs, contribution workflow | Accepted; public repository created 2026-10-25; source and Linux CI verified, with assurance gates recorded separately |
| D-005 | Landing page | Yes, separate guided entry point with synthetic demo | Reaches users who do not know SIEM tools | Recommended |
| D-006 | Core pricing | Self-hosted core free without event cap or feature expiry | Clear open-source promise | Recommended |
| D-007 | First deployment | Single node, local/small-team lab | Achievable and demonstrable | Proposed |
| D-008 | Automated response | Defer | High operational risk and trust burden | Recommended |
| D-009 | Public web experience | Static landing/docs plus browser demo using synthetic data | No-install access without hosting sensitive logs | Recommended |
| D-010 | Hosted real telemetry | Include as an optional product path on Cloudflare, behind measured quotas and security gates | User needs a no-install hosted experience for real logs; bounded free use can coexist with self-hosting | Accepted direction; implementation gated |
| D-011 | Search/data engine | Benchmark OpenSearch Security Analytics against ClickHouse using same licensed synthetic workloads | OpenSearch has more SIEM workflow built in; ClickHouse may offer better analytics/storage economics; workload and rule support decide | Open |
| D-012 | Source collection | Start with OpenTelemetry Collector Contrib, not a custom privileged agent | Broad maintained receiver ecosystem reduces first-party agent attack surface | Proposed |
| D-013 | Frontend/API candidate | React + TypeScript + Vite app with Hono API | Cloudflare documents this full-stack template; verify runtime/library compatibility in a spike | React/Vite console implemented; a local Hono read-only synthetic API is mounted in Vite dev/preview. D-017 adds a private Node/PostgreSQL gateway. Cloudflare Worker deployment and enterprise API design remain proposals. |
| D-014 | Canonical event schema | Compare OTel, OCSF, and ECS on representative fixtures before finalizing a Veycord envelope | Avoid custom field semantics and avoid lossy mapping | Open |
| D-015 | Application framework | React + TypeScript + Vite console; Cloudflare Worker API with Hono; no SSR initially | Direct Cloudflare-supported path fits an interactive console and minimizes runtime complexity | React/Vite and a Hono Fetch-compatible read-only fixture API are implemented locally; D-017 adds a private Node/PostgreSQL slice; Cloudflare deployment and corporate rollout remain unvalidated |
| D-016 | Local synthetic API slice | Expose bounded read-only event and detection fixture endpoints through Hono in Vite development and preview | Enables local UI/API contract work without collecting real telemetry | Implemented; see [API-v1](../../API-v1.md), `server/app.ts`, and `vite.config.ts`. Not deployed or suitable for customer data. |
| D-017 | Private database foundation | Same open-source application with private operator-owned PostgreSQL database and Node/Hono gateway | Portable schema, no public data/secret commits, server scope, bounded vertical slice before high-volume engine benchmark | Implemented locally; single service key/workspace only. See [[../02-Architecture/Private Deployment Decision]]. Hosted deployment and enterprise gates remain open. |
| D-018 | Bounded operations | PostgreSQL-serialized quotas, transactional audit, explicit held-evidence retention and authenticated local recovery | Cross-process integrity and reproducible recovery without an extra data service | Implemented and locally verified in batch003; see [[../02-Architecture/Operational Controls]]. Corporate rollout gates remain open. |
| D-019 | Dashboard component strategy | Apply shadcn/Watermelon composition using scoped native CSS, semantic React controls and existing Lucide icons; add dev-only axe checks | Improve clarity/verification without a Tailwind migration or copied registry runtime | Implemented in batch004; see dashboard pattern review. New demo sessions default light, retain dark preference; no decorative live pips or trend charts. |
| D-020 | Source assurance gate | SHA-pinned CodeQL JS/TS security-extended analysis with a fail-closed high/critical SARIF gate and required branch checks | Make static findings reviewable and prevent a successful scan job from silently accepting high findings | GitHub scan at 6821b0d passed with zero open alerts; protected main requires verify and CodeQL job checks. This is not certification. |
| D-021 | Detection revision evidence | Per-rule semantic versions, explicit authored/license/experimental metadata, protected read-only catalog, nullable stored revision for historical findings | Preserve the evaluated version without fabricating legacy provenance; no runtime rule execution or new dependency | Implemented in batch005; correlation/suppression and historical registry remain open. See `docs/DETECTION-RULES.md`. |

| D-022 | Console navigation | Workflow groups, native URL view/event links, optional saved icon rail, native bounded command search and honest workspace routing | Improve discoverability, history and keyboard use while extracting navigation from the large console | Implemented in batch006; no new runtime dependency, authentication or reporting-engine claim. See navigation design plan and tickets. |

## Decision gates

### D-023 — public web distribution (2026-10-28)

Accepted direction from the owner: provide a no-install public website/demo and retain GitHub as the source/self-hosting path. Implement a separate public build importing only the synthetic API; embed built assets in an ESM Worker and publish through Sites. This implements the public part of D-009/D-013/D-015/D-016. It does not port the private PostgreSQL gateway to Workers. `.env` loading is disabled for this build; `/workspace` becomes a self-hosting guide. Publishing requires a pushed source snapshot, matching archive and successful native deployment. GitHub merges are not automatic deployment triggers. See batch007 and `docs/PUBLIC-WEB.md` for actual publication evidence.

Remaining decisions and gates: benchmark the data plane; select first event format; verify public repository configuration and release provenance. The local synthetic API remains a demonstrator. D-017 selects PostgreSQL for the private bounded-event/control-store foundation; it does not resolve D-011 high-volume search or commit a hosted runtime. Before government-facing claims: independent security review and requirements mapping.

## Questions to resolve

1. Is first success aimed primarily at an aspiring analyst, a small IT team, or both (with learner-first onboarding)?
2. Are we willing to depend on OpenSearch as the backend for the MVP, or should the first milestone compare another engine?
3. Is Veycord the brand for both the public website and the software, or should Sentinel have a separate product identity?
