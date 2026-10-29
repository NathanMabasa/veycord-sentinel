# Veycord Sentinel handoff — 2026-10-29 identity selection

## Current work

Owner authorized the commercial sprint updates. Read docs/brain/04-Roadmap/Commercial Sprint Plan.md, docs/tickets/SPRINT-BACKLOG.md and docs/brain/04-Roadmap/Sprint 0 Execution.md. Working scope and benchmark targets1009-A/C remain In review, not approved guarantees.1009-B evidence reconciliation is Done after protected PR14 merged.

PR14 final head daa80907e05701520c29dd92bfd34e573cf84f5c passed verify40737877421 and CodeQL40737877176. It merged without bypass to69de0447952e1dd503d7e46b3b7d0c51b0ab8a82. GitHub API reconfirmed strict required verify/CodeQL, admin enforcement and no force push/deletion. Historical onboarding PR13/publication details are preserved in batch009 and live-onboarding-batch009.json. Public Site version4 remains the last publication; no web deployment was changed here.

## SEN-208A-1 selection

Branch codex/identity-selection documents self-managed Better Auth on existing private Node/Hono with isolated PostgreSQL identity tables. See docs/brain/02-Architecture/Identity Provider Decision.md and D-026. Neon managed MFA is still on its roadmap, so it does not satisfy the current mandatory MFA/self-host combination. Keycloak remains a future enterprise IdP alternative. Installed neon-auth guidance, its parent reference and primary docs were used. No cloud database/identity account was provisioned.

Isolated ignored .data/identity-selection contains exact better-auth1.7.14 + pg8.23.1. npm ci used --ignore-scripts. Installed source/declarations expose the2FA plugin.35 declared dependencies:33 MIT/2 ISC. Isolated npm audit reports zero known advisories at this snapshot; not an independent assessment. Selection evidence records integrity/license/lock hashes, Node engine declarations and unverified flows. App package.json/package-lock.json are unchanged; no auth runtime, migration or connection to private data occurred. No application tests were run for this docs/selection slice; required CI belongs to the final PR head.

## Next code slice

After protected review/merge of selection, progress SEN-208A-2: exact app dependency/reviewed identity SQL in isolated PostgreSQL; separate migrator/runtime roles; disabled-by-default private config/handler/bootstrap; password/TOTP enrollment/challenge/recovery with session assurance; then208B membership/roles before cookie-backed telemetry. Keep public Worker independent. Do not treat a user profile2FA flag as session assurance, or let social/passwordless paths bypass it. Keep CSRF/origin checks and server-backed revocation. Production sender/HTTPS/recovery/region ownership require explicit configuration; local synthetic work is unblocked. No fabricated login or default credentials.

## Preserve and automation

Preserve .env/.env.runtime, .data/postgres and external backup key; never print secrets. Existing private mode and CSP unchanged. A transient GitHub CLI checkout conflict after PR14 remote merge was resolved by copying the local handoff to ignored .data/handoff-before-sprint1.md, restoring only that file for checkout and reapplying its saved contents before updating this handoff; no local history was lost.

Check usage first and stop before10% remains. The one-time resume-sentinel-commercial-sprint follow-up was deleted successfully after this usable continuation. No recurring unattended implementation is implied beyond the owner's existing authorization. Save final PR/check/merge outcome before finishing.

PR15 https://github.com/NathanMabasa/veycord-sentinel/pull/15 contains the identity-selection review. Final required checks and protected merge must be verified against its current exact head, not an earlier documentation revision. No new auth flows are activated by this PR.

## Final continuation result

PR15 merged without bypass at2026-10-29T07:42:52Z to main2400b0a20fdb598f4af376064093a3de9464d1c8. Exact final head7e25d5172ecf9ecfe25b8f56d4ed89bf57e2fc64 passed verify40836629970 (2m34s), CodeQL40836629946 (1m13s) and the CodeQL check. Earlier2406b38 checks are historical; only the final head authorized this merge. SEN-208A-1 selection/design is Done; SEN-208A-2/B authentication/MFA/membership implementation remains Backlog. No application code, root dependency/lockfile, schema, private settings or public publication changed during this continuation. No new local application tests ran; required GitHub CI passed on the final docs head. One-time automation deletion succeeded.

Final outcome/status edits in HANDOFF.md and SPRINT-BACKLOG.md are local post-merge records to include in the next protected implementation PR; do not push directly to main. Next useful work is actual SEN-208A-2 code against isolated synthetic PostgreSQL, using the installed/pinned package APIs and reviewed role/schema/configuration contract. No owner input is needed merely to begin local development; production origin/sender/operations and proposed1009-A/C acceptance are still review items.

## Batch011 active implementation

Repository moved to /Users/nathanmabasa/Code/thannlab/veycord; old Downloads path no longer exists. Branch codex/private-authentication implements private accounts/TOTP/recovery/session and fixed-workspace roles. Read docs/IDENTITY.md and BUILD-BATCH-011.md. Source has been built;42 existing unit/API and five public Worker checks passed. No new auth CI fixture/regression suite exists yet; keep PR draft until final integration/security review. Shared60/min workspace read budget can affect rapid repeated browser review; first StrictMode abort was fixed. Latest paced isolated browser review has session32014; inspect its final output/report before claiming acceptance. New isolated lab path is recorded in ignored .data/auth-build-current; it contains private-config.json and synthetic account files mode0600. Never print their secrets. Vite5178 is owned session75383; original PostgreSQL/config untouched. Build artifacts overwritten by public build must be restored by regular build for standalone Node. Do not deploy authentication to the public Site; hosting is deferred. Save exact PR/current verification state and stop before10% remains.
