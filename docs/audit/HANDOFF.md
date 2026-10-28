# Veycord Sentinel handoff — 2026-10-28 public web continuation

## Owner clarification (latest)

Use Sentry as a reference for a hosted/self-hosted product with connection onboarding and GitHub downloads. Do not pursue a Sentry account/DSN or error-monitoring integration. Build a clear get-started path and real self-hosted HTTP setup; hosted real-data signup remains gated by identity, tenant isolation and operations. PR12 still needs the final heading fix to pass; follow with batch009 onboarding. Saved Site versions2/3 are not deployed.

## Current state

PR12 (publish-web-demo) is the protected integration source: https://github.com/NathanMabasa/veycord-sentinel/pull/12 . Final required verify/CodeQL must pass before squash merge; never bypass. Source/publication docs: docs/tickets/BUILD-BATCH-007.md and docs/PUBLIC-WEB.md. GitHub remains public Apache-2.0 and its homepage points to https://veycord-sentinel.nyikonathanmabasa.chatgpt.site .

Site project appgprj_6ae1df006640819185d4ffa2e912d1b5 is public. Version1 remains live. Version2 was saved from Site commit8519b99ad4973fc83ef5ad50e8de69c766e1d037 but deliberately not deployed because Linux verification exposed a second narrow-screen issue. Do not deploy that saved version. Reuse the Site identity and export the corrected committed source, then build/save/deploy its matching archive as the next version.

## Verified corrections and remaining integration

Historical CI40682749080: homepage scope link nowrap overflow at320px, scrollWidth343. CI40686293935: homepage fixed; new self-hosting action inherited nowrap text and overflowed345px even though its box fit. Both now have scoped max-width/normal-wrap rules; the homepage arrow cannot shrink. No font-size reduction, hidden overflow, selector weakening or CSP relaxation. Public browser audit adds20px enlarged-text checks of link/icon/text-range bounds. Standard build,38 unit checks, five Worker contracts and38 public browser checks pass locally. Final Linux required checks remain authoritative; use current PR head rather than historical run state.

## Publishing

Use Sites skill. Existing ignored .data/public-site has its own source Git history and hosting identity; preserve .git. Sanitize using git archive of the chosen committed source, never copy .env, .env.runtime, .data, DB, keys or archives. Site-only package script mapping: save regular build as build:self-host and map build to npm run build:public. Fresh credential stays in memory; pass through hidden stdin to site-workflow helper, never in args/files/output. Source helper must push exact source and package matching archive before save/deploy. Current public preview owns loopback4173. Public build replaces dist; standard build restores private-compatible assets. No private Node server was started or customer data accessed.

## GitHub and Sentry request

Live API evidence: docs/audit/github-public-protections-batch007.json. Existing admin enforcement, strict verify/CodeQL, resolved conversations, linear history, blocked force pushes/deletion, secret scanning/push protection/private reporting, default read-only Actions and no Actions PR approval are verified. Squash-only merging configured. External approving review count is0 because there is one maintainer; this is not independent human review.

Owner requested Sentry error monitoring. Official sources and privacy/runtime decisions are in docs/brain/03-Security/Application Error Monitoring.md; tickets are docs/tickets/BUILD-BATCH-008.md. No Sentry connector was available and no SDK/DSN/reporting is active. Require owner project URL/public DSN and region/retention before activation; never request an auth token in chat. Do not copy the full quickstart: current dataCollection defaults, replay and breadcrumbs can include sensitive context. The optional Sentry GitHub App has source/check/issue/PR write permissions and is not required for ingestion. Limit it to Sentinel only if selected. Cloudflare SDK compatibility with Sites remains unverified. All private deployments remain uninstrumented by default.

## Preserve and stop conditions

Private PostgreSQL .data/postgres, .env/.env.runtime and external backup key are untouched. Never print/commit secrets. Use synthetic records only. Check usage in bounded phases and stop before10% remains. Disable resume-sentinel-public-mobile-fix after this usable continuation. Finish publication evidence/tickets with actual IDs and final-head checks before reporting completion; monitoring connection still needs owner input.
