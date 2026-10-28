# Veycord Sentinel handoff — 2026-10-28 product onboarding

## Owner intent

Use Sentry as a reference for hosted/self-hosted product paths and connection onboarding. No Sentry account, DSN or error-monitoring integration is requested. Batch008 remains deferred. Build batch009 provides web-demo, GitHub download and real self-hosted HTTP setup. Hosted real-data signup remains gated by identity, authorization, isolation, quotas and operational/privacy reviews.

## Verified base

PR12 was protected-squash merged without bypass at main a0577c1d18e95a776d044a357d639b796d4819fc after final-head c6dc22c verify40688432445 and CodeQL40688432436 succeeded. It fixes Linux320px link overflow and the self-hosting title. GitHub remains public Apache-2.0, strict verify/CodeQL, admin enforcement, no force pushes/deletion, resolved conversations, linear history, secret scanning/push protection/private reporting, read-only Actions and squash-only merging. Required independent approving reviews remain0 for the solo maintainer; do not imply outside human review.

## Current candidate

Branch add-product-onboarding adds /get-started, /connections and /connections/http, direct source ZIP, safe generated Bash, actual synthetic JSON download and honest planned-adapter statuses. No runtime dependencies added. Local standard/public builds,42 unit/API/model checks, five built Worker contracts and65 public browser checks pass. Nine new axe states report zero violations/incomplete groups after correcting public button/header contrast. The generated Bash is tested over the real loopback HTTP interface with an isolated in-memory store; actual PostgreSQL integration remains in required CI. See docs/tickets/BUILD-BATCH-009.md. Final-head GitHub checks and publication are still pending at this snapshot.

## Publication

Site appgprj_6ae1df006640819185d4ffa2e912d1b5 is public at https://veycord-sentinel.nyikonathanmabasa.chatgpt.site . Version1 remains live; versions2/3 were saved but deliberately not deployed. Do not deploy those older artifacts. Reuse identity and sanitized committed source. Preserve .data/public-site/.git; git archive excludes ignored private files. Site-only mapping retains regular build as build:self-host and maps build to build:public. Use Sites helper with COPYFILE_DISABLE=1 to avoid AppleDouble metadata; fresh credential remains in memory/hidden stdin only. Native save/deploy/status must match the pushed source and archive. Do not claim the current candidate is live before successful publication.

## Preserve and limits

Private .env/.env.runtime, .data/postgres and external backup key are untouched. Synthetic data only; never print or commit secrets. Public loopback preview4173 is this continuation's process; no private Node service was started. Public build overwrites dist; run standard build before private serving. Stop before10% remains and save exact state. One-time resume-sentinel-public-mobile-fix was deleted successfully after this continuation.
