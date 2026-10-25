# First public release checklist

The owner adopted Apache-2.0 and authorized public source. [NathanMabasa/veycord-sentinel](https://github.com/NathanMabasa/veycord-sentinel) was created and its public visibility verified. The connected plugin lacked repository creation, so authenticated GitHub CLI was used. Source publication is separate from running the local private database. No supported production release or cloud telemetry deployment is established.

At this snapshot, the first push and GitHub-hosted CI result are pending. Local evidence is in `docs/audit/BATCH-003-REVIEW.md`; update this record with the actual remote run before calling CI verified.

## Prepared locally

- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, synthetic-first setup, product brain and explicit limits.
- `.github/workflows/verify.yml`: read-only permissions, SHA-pinned official actions, lockfile install, build/contracts, disposable PostgreSQL and real-browser/recovery checks, public/startup regression and advisory scan. GitHub CI has not run; local tests are separate evidence.
- Dependabot configuration creates reviewable npm/Actions update PRs; no auto-merge or deployment.
- `.gitignore` excludes local configuration, database volumes, installed packages, builds and backups. Check the actual files selected for a release; ignore patterns are not a secrets audit.

## Publication review

1. D-002 was approved by the owner on 2026-10-24. Root LICENSE and package metadata now adopt Apache-2.0. The earlier proposed text remains a historical review artifact; verify third-party provenance/notices before redistribution.
2. The repository owner/name is verified; the website links to it. Source uses authored synthetic fixtures/detections and code-native brand elements; owner-supplied boards are reference-only with provenance in `docs/brand/README.md`.
3. Review dependency notices, particularly GSAP's separate Standard terms; a permissive project license cannot relicense third-party dependencies or brand assets. Finalize the dependency SBOM using `npm sbom --sbom-format cyclonedx` and retain source/version/license attribution.
4. Private vulnerability reporting was enabled and verified through the repository API. SECURITY.md links to its private advisory form. No response SLA or supported production version is promised. Branch checks will be configured after observing the first CI check name/result; signed artifact/release provenance remains open.
5. Initial staged review: 182 public source/docs/assets/config files; no private config/database/archive paths staged and no configured credential/key values found. The ignore rules exclude private data and builds. Review again after changes. No corporate/POPIA/OWASP certification claim is supported.

## CI source verification

Official [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [setup-python](https://github.com/actions/setup-python) v6 tag SHAs were resolved from their upstream repositories on 2026-10-24 and pinned. The workflow uses Node24, Python3.12 and PostgreSQL16 tooling. Playwright1.60.0 is pinned to the version used in local checks, not claimed to be the newest release; review tool updates separately. A GitHub-hosted Linux run is required before calling the workflow verified. Test archives and screenshots use synthetic data; the workflow does not upload private artifacts or deploy anything.
