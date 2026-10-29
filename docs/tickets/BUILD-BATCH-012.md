# Batch012 — persistent account request allowances

Owner resumed implementation2026-10-29. Continues draft PR16 and SEN-208C-2; hosting remains deferred. This is a partial resource-control slice, not completion of the commercial service-wide gate.

| Ticket | Candidate implementation | Verification |
| --- | --- | --- |
| SEN-208C-2a | Per-workspace/account read60, ingest10 and case-write10 allowances per database-clock minute; atomic saturating counters shared across compatible Node instances | Two real Node processes share exactly59 remaining accepted reads and21 limited responses in an80-request seeded-window burst; restart and fresh-session requests remain limited; another account succeeds |
| SEN-208C-2b | Fixed three-category keys, membership FK/cascade, Retry-After1–60, unavailable-budget503 with no memory fallback | Separate operation limits, window rollover without row growth, forged scope headers ignored; revoked grants block a case mutation without storing it |
| SEN-208A-2 follow-up | Ordered identity migration002 and required runtime schema version2 | Existing-v1 upgrade, repeated setup and rejection of unsupported version3; accounts/factors preserved in the synthetic lab |
| UI-012 | Understandable quota wait, unread error-body cancellation, no automatic mutation retries; logout independent of read quota | Actual PostgreSQL-backed429, visible wait message and successful logout at320px |

Implementation uses existing PostgreSQL/pg/Hono; no additional dependency or paid service. Operator service-key requests keep their separate process-local limits. Budget rows contain opaque user/workspace IDs, category, window and bounded counts; no credentials, IP addresses or event payloads. Three rows per operator-provisioned membership bound key cardinality. Fixed-window boundary bursts are explicit; unknown/future concurrency/global capacity limits are not claimed.

The first quota browser test timed out waiting for network idle even though `/workspace` rendered its real429 wait message. Diagnostics recorded successful metadata,429 workspace responses and pending unread bodies. Cancelling unread error-response bodies resolved the timeout in the rerun; the test still requires actual backend429 and the rendered wait, with no relaxed acceptance selector. Grammar handles a one-second wait.

Local checks:48 unit/configuration results,26 identity results (25 scenarios including actual multi-process/browsers), two PostgreSQL/private-browser results, standard/public builds and five public Worker checks passed. The final sequential build/unit/identity rerun also passed; exact-head GitHub CI and final review remain pending. Visual review found a remaining truthful-state bug: Latest event shows No events recorded when a fresh429 prevents summary loading; distinguish unavailable from a successful empty result before acceptance. Independent review, production proxy/TLS/operations, public/anonymous abuse controls, full service-wide quotas and commercial release gates remain open. No public Site deployment or private configuration edit was made.

Primary implementation reference: [PostgreSQL16 INSERT/ON CONFLICT](https://www.postgresql.org/docs/16/sql-insert.html). Atomic database updates provide shared counters; the integration results establish this implementation's observed behavior, not a throughput guarantee.
