# Sprint 0 Execution

Started2026-10-28 under the owner's instruction to begin the sprint updates. Accountable implementation owner: Codex; product scope and commercial-budget approval: project owner. This is a synthetic development baseline, not customer-data approval.

## SEN-1009-A — In review

Working implementation scope: small IT team, private single-node Node/Hono/PostgreSQL, maintained Linux authentication collector with an explicitly versioned adapter, explained detections and durable investigations/reports. Preserve the public synthetic website/demo and Apache-2.0 source path. Hosted real data, native EDR, automatic response and24/7 service are outside this initial scope. The owner's broad begin instruction authorizes work, but does not establish agreement to commercial prices, capacity guarantees or a paid provider. Validate this scope at sprint review before marking Done.

## SEN-1009-B — In progress

Reconciled PR13 via GitHub CLI: final head dc973b297c592bdd98b346e869a3fc4c45750fbd, merge ddd966102d2ce091d20e484bb95108a230ccc527, merged2026-10-28T14:01:55Z. Final-head verify40701312513 and CodeQL40701312605 are the cited checks; conclusions are checked separately before PR review. Prior live evidence is docs/audit/live-onboarding-batch009.json:11 checks for routes/demo/CSP, origin update/download,320px layouts and absent private API. This is historical publication evidence, not a new live scan.

Release-gate reconciliation:

| Gate | Current state | Missing evidence / next work |
|---|---|---|
| SEN-208A | Open | Maintained identity/provider selection, session/MFA/recovery/revocation |
| SEN-208B | Open | Individual membership/roles and cross-user/workspace denial matrix |
| SEN-208C | Partial foundation | Full privacy lifecycle, backup-expiry coordination, distributed limits and physical bounds |
| SEN-208D | Partial foundation | Individual/external audit, scheduled offsite recovery, key ownership and operating objectives |
| SEN-209A | Open | One maintained collector, normalized contract and observable delivery/error behavior |
| SEN-209B | Open | Representative sustained/burst/search/detection/cost benchmark and data-plane decision |
| SEN-209C | Partial foundation | Six versioned experimental rules exist; correlation, scheduling, tuning and exercised rollout remain |
| SEN-210 | Partial foundation | Public Apache-2.0 source/protected CI exist; signed supported release/provenance/triage ownership remain |
| SEN-211 | Partial foundation | Navigation/theme/mobile improvements exist; remaining console decomposition and broader accessibility evidence remain |
| SEN-212 | Open | Requirement-level ASVS evidence and independent security/privacy/deployment review |

Detailed existing evidence and limitations remain in docs/tickets/NEXT-RELEASE-GATES.md; this table does not close those gates. Preserve this research, sprint plan and publication evidence through a protected documentation PR before marking1009-B Done.

## SEN-1009-C — Draft targets, In review

These are proposed laboratory acceptance targets, not measured capacities, pricing or SLAs. Review/agree them before benchmark execution. Do not provision a paid server from this draft.

| Dimension | Proposed first benchmark |
|---|---|
| Reference environment | Disposable Linux host,4 vCPU,8GiB RAM,40GiB disk; record CPU/storage/software versions and competing load; synthetic data only |
| Workload | One Linux-auth source format,10 synthetic hosts,100 users;1KiB median/16KiB maximum canonical event;100-event batches within existing256KiB bound |
| Load |10 events/sec for30min,100 events/sec for60sec burst, five concurrent analysts; clearly separate generator rate from durably accepted rate |
| Queries | Time+host, bounded text, evidence lookup and24h summary; p95 target≤2sec, no silent truncation |
| Pipeline/detection | Normal-operation receipt-to-search p95≤5sec; eventual correlation target≤60sec; measure source lag separately |
| Failure integrity |60sec ingest outage plus replay; no silently lost acknowledged events and no duplicate stored event identity; bounded buffering/rejection explicitly reported |
| Retention | Initial7-day synthetic lab policy; measure bytes/event and calculate full-retention footprint, do not claim seven days were physically exercised by a short run |
| Recovery | Proposed RPO≤24h/RTO≤4h with scheduled offsite backup and measured restore; current manual backup does not meet this automatically |
| Notifications | Proposed healthy test-receiver delivery p95≤60sec; record retries/dead letters separately, no external delivery without approved configuration |
| Capacity/cost | Physical peak/steady CPU/RAM/disk and queue caps recorded; target≤75% disk with backpressure before exhaustion. Monetary budget pending owner/provider/region selection; cannot approve hosting economics yet |

If the budget fails, reduce supported scope or make a benchmark-backed architecture change; do not hide failed samples. Tests/benchmarks have not been run as part of this documentation slice.

## Next implementation

Refine SEN-208A-1: inspect installed authentication guidance, compare maintained identity options against both self-host/private Node and optional hosted constraints, and write the session/threat model and provider input requirements. Keep current private mode disabled by default and synthetic public build independent. Do not retrofit an unreviewed homemade password/session scheme.
