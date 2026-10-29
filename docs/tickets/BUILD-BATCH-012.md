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

Local checks:48 unit/configuration results,26 identity results (25 scenarios including actual multi-process/browsers), two PostgreSQL/private-browser results, standard/public builds and five public Worker checks passed. The final sequential build/unit/identity rerun also passed; exact-head GitHub CI and final review remain pending. Initial visual review found a truthful-state bug, resolved in the continuation below: Latest event shows No events recorded when a fresh429 prevents summary loading; distinguish unavailable from a successful empty result before acceptance. Independent review, production proxy/TLS/operations, public/anonymous abuse controls, full service-wide quotas and commercial release gates remain open. No public Site deployment or private configuration edit was made.

Primary implementation reference: [PostgreSQL16 INSERT/ON CONFLICT](https://www.postgresql.org/docs/16/sql-insert.html). Atomic database updates provide shared counters; the integration results establish this implementation's observed behavior, not a throughput guarantee.

## Reset continuation — 2026-10-29

The cc48e3d head passed CodeQL40933798036 but failed verify40933798032 at the browser quota-message assertion. Its rendered route was `/workspace` with real populated counts and a timestamp: the database minute legitimately rolled over between the initial429 and reload. The test now coordinates with its disposable-database parent through a private fixture file to hold that window. No app endpoint or production clock override was introduced; the actual429/message requirement remains.

The same fixture also exercises a real empty database, then quota unavailability. Latest event now reports `Unavailable` until a summary is loaded; only a successful empty summary reports `No events recorded`. Normal populated data still shows its timestamp. Browser evidence has22 passing checks, with readable320px empty and quota screenshots. Regular build,48 unit and26 identity results pass locally. The preserved synthetic identity-v2 lab passed enrolled TOTP login, event read200 and logout401 at actual Vite5178; its private config and original private database were not changed. New final-head CI remains required. The one-shot resume automation was deleted after this usable continuation.

Verified source head978b93edb323a585bc935b06cc3c3515917b33b6 passed required verify40943986954 at2026-10-29T19:55:34Z and CodeQL40943986961 at19:53:43Z, plus the repository CodeQL check. The Linux browser now passes the actual empty/quota states. Any later documentation head still requires its own protected checks. PR16 remains draft/unmerged; these implementation checks do not complete independent or production review.
