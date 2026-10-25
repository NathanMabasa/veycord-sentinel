# Batch003 integration review

2026-10-24. Primary engineer reviewed bounded agent work across UI, PostgreSQL operations, and recovery. All records used for verification are synthetic in disposable databases. The existing local synthetic instance was preserved; retention deletion was not applied there.

## Delivered

- Readable semantic phone event cards; contained desktop/tablet table with keyboard scrolling; compact workspace heading and real sticky-header viewport checks.
- Real PostgreSQL 24-hour analytics, exact textual bucket values, source/severity counts, independent bounded event time ranges.
- Cross-process workspace event/byte/case/audit capacities; transactional allowlisted mutation audit; administrator dry-run/apply limit changes.
- Received-time retention dry run/apply, maximum 5,000 deletions and open/closed case holds.
- Authenticated encrypted local backups, empty-target recovery, known older schema upgrade and restricted runtime grant verification.
- Compiled Node runtime, runtime-only owner-private environment file and administrative credential rejection in that dedicated process.
- Apache-2.0 adopted by the owner; dependency notices/SBOM, contribution/security policy, public source preparation and SHA-pinned CI.

## Integration defects corrected

The prior mobile table passed overflow checks while text overlapped. It now uses cards that retain every event field; long unbroken values wrap. A positioned ancestor contains screen-reader-only table text. Full-page screenshots captured mid-scroll placed sticky chrome inside the composite; viewport checks now inspect actual sticky placement and full-page captures begin at scroll zero.

Event pages keep exact time/filter bounds across cursor requests. Search changes fetch only events; full refresh updates all panels. Case counts update on close/reopen and unsaved notes survive refresh. Selects have explicit accessible names; all four time windows are checked against actual API timestamps. A loaded application now has a 1.2-second animation handover deadline, so stalled animation frames cannot leave the workspace inert. The startup regression explicitly stalls frames and verifies recovery. Browser checks require completion before reporting success and avoid CSP-incompatible bare expression evaluation.

Untrusted raw/attribute strings have both field and UTF-8 bounds. Quota failure rolls back the entire mutation. Audit capacity bounds repeated updates; a full audit refuses writes without deleting evidence. Date-specific database fixtures use matching explicit timestamps.

Backup review corrected existing-file cleanup so no-overwrite failures preserve the destination, rejects connection-info injection through database names, authenticates before restore, bounds archive output, detects non-empty targets, upgrades supported older migration history and reapplies restricted runtime grants. A failed post-restore upgrade/check quarantines the target. Archives must originate from trusted SQL sources.

## Checks actually run

| Layer | Result | Evidence |
|---|---|---|
| TypeScript and production/runtime build | Pass | `build-batch003.txt` |
| Unit/API/detections/gateway/runtime config | 33 pass | `unit-tests-batch003.txt` |
| Actual PostgreSQL | 2 pass, 0 skipped | `database-tests-batch003.txt` |
| Browser against disposable PostgreSQL + compiled Node | 55 pass, completed | `private-browser-results.json` |
| Authenticated recovery and legacy upgrade | 2 pass, 0 skipped | `recovery-tests-batch003.txt` |
| Public desktop/mobile and demo workflows | 62 pass | `browser-results.json` |
| Startup/loading and failure recovery | 9 pass | `bootstrap-results.json` |
| Known npm advisories | 0 at check | `dependency-audit-batch003.json` |
| Configured secrets and private exclusions | No matched values; paths ignored | `publication-safety-batch003.json` |

Screenshots inspected by the primary: `screenshots/private-workspace-overview-1440.png`, `private-workspace-top-320.png`, mobile event cards at 390/360/320px, long values at 320px and actual scrolled viewport captures. Visual inspection is scoped and does not establish full WCAG conformance. The older failed screenshots/logs remain historical regression evidence, not the current pass record.

## Boundaries and remaining work

This is a single-operator alpha with six deterministic rules. It has no supported public multi-user telemetry service, individual identity/MFA/roles, collector, automatic retention schedule, full privacy export/deletion, distributed rate limiter, externally anchored audit, scheduled/offsite backups or sustained-volume benchmark. There is no universal detection, production, corporate/government, POPIA or ASVS certification claim. See `../tickets/NEXT-RELEASE-GATES.md`.

Source publication status and GitHub-hosted CI evidence are recorded separately in `../release/RELEASE-CHECKLIST.md`. Local checks do not imply that the Linux workflow has passed.


## Public source verification, 2026-10-25

Source is published at https://github.com/NathanMabasa/veycord-sentinel. GitHub-hosted run40165627076 passed at8c368c4 after a test-cluster portability correction; run40165791376 also passed at e8d0f1b. These are actual Linux results distinct from local records. Later dashboard and CodeQL findings/remediation are tracked in Batch004, not retroactively called part of the earlier baseline.
