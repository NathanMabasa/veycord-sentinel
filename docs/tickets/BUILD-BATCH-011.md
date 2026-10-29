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
