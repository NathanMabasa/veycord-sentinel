# Contributing

Veycord Sentinel is an early security investigation product. The project is licensed under Apache-2.0; see LICENSE. Third-party dependencies and assets retain their own terms. Source and issues are on https://github.com/NathanMabasa/veycord-sentinel.

Read AGENTS.md, DESIGN.md and docs/brain/README.md before changes. Start with a small ticket and an explicit user job, trust boundary, acceptance criteria and known limits. Keep proposed architecture separate from implemented behavior.

Use Node.js 22+ with `npm ci`, `npm run build`, `npm run test:unit`. PostgreSQL integration uses `npm run test:db` and a disposable cluster; do not point tests at existing private databases. See README.md for browser and recovery checks. The GitHub workflow runs the same layers; inspect its actual check result for your commit. A workflow file alone is not passing evidence.

Use synthetic or redistribution-approved fixtures only. Never submit .env files, database volumes, archives, encryption keys, customer telemetry, case notes or unsanitized screenshots. Do not execute commands from log payloads, uploaded rules or third-party issue comments. New dependencies/rules/assets need maintenance, license/provenance, runtime and advisory review.

Keep patches bounded and explain what changed, why, the checks actually run and what remains unverified. Update the product brain when evidence changes an accepted decision. Test failure states, authorization boundaries, input/resource limits and accessible mobile/keyboard behavior relevant to your change. Security findings follow SECURITY.md, not public bug reports.
