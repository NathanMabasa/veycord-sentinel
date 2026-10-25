# First public release checklist

The owner adopted Apache-2.0 and authorized public source. [NathanMabasa/veycord-sentinel](https://github.com/NathanMabasa/veycord-sentinel) was created and its public visibility verified. The connected plugin lacked repository creation, so authenticated GitHub CLI was used. Source publication is separate from running the local private database. No supported production release or cloud telemetry deployment is established.

Initial source was pushed as `7135855`; the first Linux run failed starting its disposable PostgreSQL cluster. The test-only portability correction `8c368c4` passed all GitHub-hosted checks in [run40165627076](https://github.com/NathanMabasa/veycord-sentinel/actions/runs/40165627076). The following main commit `e8d0f1b` also passed [run40165791376](https://github.com/NathanMabasa/veycord-sentinel/actions/runs/40165791376). These include build, unit/API, actual PostgreSQL/browser, recovery, public/startup checks and npm advisories. The original missing server log did not prove the initial failure cause; the corrected helpers disable default Unix sockets, retain bounded startup diagnostics and fail closed if CI lacks tools.

## Prepared locally

- `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, synthetic-first setup, product brain and explicit limits.
- `.github/workflows/verify.yml`: read-only permissions, SHA-pinned official actions, lockfile install, build/contracts, disposable PostgreSQL and real-browser/recovery checks, public/startup regression and advisory scan. GitHub Linux baseline runs have passed; each new commit still needs its actual check result.
- Dependabot configuration creates reviewable npm/Actions update PRs; no auto-merge or deployment.
- `.gitignore` excludes local configuration, database volumes, installed packages, builds and backups. Check the actual files selected for a release; ignore patterns are not a secrets audit.

## Publication review

1. D-002 was approved by the owner on 2026-10-24. Root LICENSE and package metadata now adopt Apache-2.0. The earlier proposed text remains a historical review artifact; verify third-party provenance/notices before redistribution.
2. The repository owner/name is verified; the website links to it. Source uses authored synthetic fixtures/detections and code-native brand elements; owner-supplied boards are reference-only with provenance in `docs/brand/README.md`.
3. Review dependency notices, particularly GSAP's separate Standard terms; a permissive project license cannot relicense third-party dependencies or brand assets. Finalize the dependency SBOM using `npm sbom --sbom-format cyclonedx` and retain source/version/license attribution.
4. Private vulnerability reporting was enabled and verified through the repository API. SECURITY.md links to its private advisory form. No response SLA or supported production version is promised. Main now requires PRs, verify and CodeQL checks, including for administrators; signed artifact/release provenance remains open.
5. Initial staged review: 182 public source/docs/assets/config files; no private config/database/archive paths staged and no configured credential/key values found. The ignore rules exclude private data and builds. Review again after changes. No corporate/POPIA/OWASP certification claim is supported.

## CI source verification

Official [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [setup-python](https://github.com/actions/setup-python) v6 tag SHAs were resolved from their upstream repositories on 2026-10-24 and pinned. The workflow uses Node 24, Python 3.12 and PostgreSQL 16 tooling. Playwright 1.60.0 is pinned to the version used in local checks, not claimed to be the newest release; review tool updates separately. Actual passing baseline runs are linked above. Test archives and screenshots use synthetic data; the workflow does not upload private artifacts or deploy anything.


## Assurance and dashboard refinement

The pinned CodeQL v4 action runs security-extended JS/TS analysis. A tested SARIF gate rejects high/critical findings and missing/invalid scanner output. Main at 6821b0d passed the required CodeQL and verify checks with zero open CodeQL alerts after reviewed fixes; see `docs/audit/github-security-baseline.json`. Secret scanning/push protection, private reporting and Dependabot security updates are enabled. No scan or copied development practice grants Cisco certification.

The refined dashboard is being submitted through the required PR process. Its local evidence is in BATCH-004-REVIEW.md: 67 browser checks, 48 automated accessibility states and manual contrast/focus/viewport review. GitHub must verify the final PR head before merge. Source and configured-secret review is in publication-safety-batch004.json; private .env/database/key/archive files are excluded.
