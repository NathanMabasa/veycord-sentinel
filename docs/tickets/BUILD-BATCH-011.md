# Batch011 — private accounts, MFA and workspace permissions

Owner authorized implementation,2026-10-29. Repository moved from Downloads to `/Users/nathanmabasa/Code/thannlab/veycord`; preserved private files/database were located there intact. Hosting remains deferred as requested.

## Implemented candidate

- SEN-208A-2: pinned Better Auth1.7.14, separate restricted identity schema/role setup, offline user provisioning/recovery, disabled web registration, explicit origin/body/rate bounds, password/TOTP/recovery-code flows, server-backed absolute/idle expiry and revocation, private account UI.
- SEN-208B-1 partial: server-checked admin/analyst/viewer permissions on one configured workspace, separate cookie API, no fallback to the service key. Hosted/multiple-workspace lifecycle and its full isolation matrix remain open.
- SEN-208B-2 partial: user attribution for workspace mutations and security audit, with local capacity bounds. Independent/external audit and broader operational controls remain open.
- Existing operator service API and public synthetic distribution preserved. No hosting was provisioned/published and no preserved private database/configuration was changed.

## Evidence and current boundary

Standard/public builds, existing42 unit/API checks and five public Worker checks pass locally. npm audit currently reports no known advisories. Identity schema/setup and three synthetic users were exercised on a newly created isolated PostgreSQL cluster. The first browser pass exposed a StrictMode initial-load abort; that was fixed. A later rapid repeated pass hit an events-read failure; paced verification is running with HTTP statuses recorded to distinguish resource limiting from authorization failure. Do not claim complete browser acceptance until the final report passes and screenshots are inspected.

No new auth regression suite or CI identity fixture is integrated yet. Existing CI does not establish this new MFA flow's correctness by itself. A protected draft PR and manual browser evidence are intermediate work, not commercial release approval. Further negative checks include recovery-code reuse, role/session removal and expiry, production secure cookies/proxy configuration, cross-workspace isolation and independent review.

## Paced browser result

Final isolated browser review passed49 assertions with three additional event HTTP200 records (52 report entries). Covers all three roles, password-only rejection, TOTP setup, stored event reads, role-specific operations/case permissions, foreign-origin rejection, reload/logout,320/768/1440px widths, recovery-code sign-in, body bound and browser errors. The earlier repeated-run failure did not recur with pacing; shared read limits remain a documented operational boundary. Screenshots are recorded for visual review. Recovery-code reuse, revocation/expiry and additional automated identity regression remain pending; keep the PR draft.

## Authentication verification continuation — 2026-10-29

PR16 remains a draft. The first exact head a7e21f53fa45770dc8f44df91777543a0f35773c failed verify40880568325 at `navigation_audit.py:127`: the loading screen shares the destination heading, so the assertion raced the account-availability request. The corrected audit awaits the actual Service key control and verifies `/workspace`; it retains the original requirement. CodeQL40880568426 reported `js/file-system-race` at the old operator `stat`/`readFile` pair. Operator input now opens once with no-follow/nonblocking flags, checks that descriptor's ownership/type/permissions/link count, reads at most4097 bytes and closes it. No suppression or security-gate weakening was added.

Additional review found and reproduced two security failures in this unmerged implementation. An analyst's encoded `/%61udit` route returned200 because Hono decoded it after the role policy used the raw path. Canonical-route rejection plus an explicit read/action allowlist now rejects encoded admin routes. A synthetic pg probe also showed query-string `host` and `ssl=no-verify` overriding validated constructor settings. Identity, telemetry and administrator connection factories now reject arbitrary/duplicate URL parameters; only reviewed `sslmode` and administrator-only search-path options pass. A regression covers each factory. The offline membership operator also rejects absent memberships and refuses removal/demotion of the last active administrator.

Local verification now passes46 unit/configuration checks;22 identity test results (21 scenarios plus their parent), including a real standalone browser workflow with16 checks; two PostgreSQL integration checks with the existing private browser audit; and two encrypted backup/restore checks. Navigation passes38 checks and32 automated accessibility states with zero violation groups/browser errors. Standard/public builds and five public Worker tests pass; npm audit reports zero known vulnerabilities at this snapshot. The release SBOM was regenerated for the pinned auth dependency. These counts do not constitute independent security assessment.

`npm run test:identity` is integrated into required GitHub verify CI. The fixture boots a disposable SCRAM PostgreSQL cluster, runs actual migrations and offline provisioning, uses the real gateway/auth library, and tears down its cluster. It resets limiter state between isolated scenarios and separately verifies exhausted-budget rejection. Tests cover simultaneous recovery-code consumption/reuse, expired MFA challenges, signature tampering, fresh-MFA requirements, password/operator/session revocation, membership downgrade/removal, fixed-workspace negatives, role CRUD/operations/audit, append-only ACLs and concurrent actor attribution. HTTPS handler cookie assertions are local; real deployment/proxy verification remains deferred.

Readable viewport evidence is `account-viewport-320.png`, `account-login-viewport-320.png`, `account-events-viewport-320.png` and `account-viewport-1440.png`. Login labels/inputs, workspace summary, mobile record fields and Details are readable and do not overlap; sticky navigation sits above content. The new browser test targets visible mobile cards, not the hidden desktop table. Full-page downscaled images are not acceptance evidence.

Remaining gates: final-head GitHub checks, independent review, production TLS/proxy/recovery/retention ownership, distributed per-user quotas, identity cleanup/audit capacity behavior, broader outage/abuse testing, and hosted multi-workspace lifecycle. Hosting is deferred; the public Site remains version4 with synthetic data. Original `.env`, `.env.runtime` and `.data/postgres` remain unchanged. The one-use resume automation was deleted after this continuation.
