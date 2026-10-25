# Private Deployment Decision

Decision D-017, accepted implementation direction 2026-10-24. Linked tickets: SEN-201, SEN-203–205, SEN-208–209. See [[Deployment and Cost Model]], [[Web Hosting Strategy]], [[Data Plane Decision and Benchmark]], [[../03-Security/Vulnerability Response Manual]].

## Same product, separate data

Publish the full application, schema, migrations, synthetic examples and self-hosting instructions. Each operator connects their own private database using server-only configuration. The public GitHub version should not be a crippled UI without storage capabilities. Credentials, customer records, database volumes, case notes and backups must stay out of Git. A public sample workspace must never share the private workspace's data path or credential.

Use React/TypeScript/Vite and Hono. This batch adds a Node.js gateway and PostgreSQL through `pg`; Node-specific code is not a validated Cloudflare Worker deployment. PostgreSQL is the portable first control store and bounded-event prototype. No custom database engine is needed. Benchmark representative volumes before deciding on an OpenSearch/ClickHouse event plane; preserve the `DataStore` boundary but don't pretend engine substitutions are free.

## Cheap hosting research

Primary sources checked 2026-10-24; quotes are snapshots, not procurement commitments. No hosting has been purchased or connected.

| Option | Published entry relevant to this prototype | Decision/tradeoff |
|---|---|---|
| xneelo Cloud, South Africa | 2 vCPU / 4 GB compute R198/month; NVMe R1.80/GB-month; 10 GB boot volume separate | Preferred candidate for SA private prototype after operational gates. Illustrative 30 GB total NVMe + compute = R252/month, before backups and any applicable tax/other charges. Confirm exact invoice, residency and service terms. Self-managed OS/database. |
| Hetzner Germany/Finland | CX23 €5.49/month excluding IPv4 and VAT under June 2026 adjustment | Low-cost overseas lab candidate; region/privacy/transfer review needed for South African sensitive telemetry. Don't use outdated €3.79 pricing. |
| Neon managed PostgreSQL | Free 1 GB/project, 100 CU-hours/month/project | Good synthetic development candidate. No always-on SIEM capacity promise. Verify available region, role provisioning compatibility, quotas and terms before selection. Launch pricing is usage-based. |
| Cloudflare | Worker paid minimum $5/month plus applicable usage; static UI separate | Public site/demo and later edge gateway candidate. Does not turn static hosting into this Node service or a full search/storage engine. |

Sources: [xneelo Cloud](https://xneelo.co.za/cloud/), [Hetzner adjustment](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/), [Neon pricing](https://neon.com/pricing), [Cloudflare Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/).

Recommendation: develop free locally now; choose a small SA VPS for a restricted pilot when SEN-208 gates are met. A free synthetic public demo can coexist with a paid private hosted service or user-operated server. Open-source software does not remove hosting costs. Don't promise unlimited free hosted logs.

## Scaling and economics gates

One VPS with app plus database is a prototype with one failure domain. Next: isolated private database network, independently restorable encrypted backups, bounded disk/retention, monitored pool/query saturation, explicit log size/time limits, sustained-volume tests. Add durable ingestion queue and worker scheduling before promising reliable burst handling. Stateful detection must handle late events, clocks, retry and idempotency. Multi-replica servers require distributed quotas and properly managed identities. Never scale an unbounded scan merely by adding web replicas.

Measure bytes/event including indexes, 7/30-day retention, sustained and burst events/sec, search p50/p95/p99, collector retry/loss, CPU/RAM/disk, restore time, detection latency and false positives. Example capacity arithmetic: 10 events/sec × 1 KB × 86,400 ≈ 864 MB raw/day before indexes, backups or replication. Small free databases are unsuitable for that retention. Ingest/query/storage costs, support and backup storage belong in the hosted plan.

## Deployment status

Implemented locally: service-key auth, fixed server workspace, bounded ingestion/querying, deterministic findings, durable cases, parameterized PostgreSQL access, RLS and restricted runtime-role checks. Not yet implemented: interactive identity/roles, multi-tenant public signup, sustained-volume validation, automatic retention/full privacy deletion, individual/externally anchored security audit records, collector deployment, HA, signed releases, production Cloudflare backend. See `docs/PRIVATE-WORKSPACE.md` for setup and `docs/PRIVATE-API.md` for actual contract. These limits supersede older brain statements that no persistence exists, without declaring the proposed enterprise architecture complete.

Batch003 supersedes the earlier missing-operations statement: manual received-time retention, logical quotas, append-only mutation audit, real activity analytics and authenticated encrypted local backup/restore are implemented and tested. Scheduling/offsite recovery and the broader release gates are not. See [[Operational Controls]].
