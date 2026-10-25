# Veycord Sentinel engineering instructions

This repository's product and architecture source of truth is the Obsidian-compatible brain in [`docs/brain/README.md`](docs/brain/README.md). Before implementation, read that index and the relevant notes under `docs/brain/`. Treat proposals as proposals and accepted decisions as constraints. When evidence changes a decision, update the decision register and supporting notes.

For interface implementation, follow [`DESIGN.md`](DESIGN.md) and [`docs/brain/05-UX/Visual Design System.md`](docs/brain/05-UX/Visual%20Design%20System.md). Treat files under `docs/brand/reference/` as references, not production logo assets.

## Project principles

- Act as a senior product/security engineer: inspect the repo, state assumptions in the work, compare options using evidence, and avoid premature abstraction.
- Veycord Sentinel is an open-source security monitoring and investigation application with both self-hosted and optional Cloudflare-hosted use. Hosted real telemetry is sensitive and may include personal information.
- Never use real customer telemetry in examples, tests, or demos unless explicitly authorized and properly sanitized. Default fixtures and demo data must be synthetic or licensed for redistribution.
- Enforce tenant authorization server-side on every API, query, export, queued job, and object-store operation. Do not trust tenant identifiers supplied only by clients.
- Bound untrusted log input, query cost, storage, retention, concurrency, and resource use. Never execute code or commands from event payloads or detection rules.
- Do not claim POPIA compliance, government approval, feature parity, or production readiness without supporting evidence and review.
- Check licenses and provenance for code, dependencies, detection rules, schemas, sample data, and visual assets before redistribution.

## Working with the product brain

- Use `docs/brain/09-Engineering/Build Map and Traceability.md` to locate workstreams, dependencies, and release gates.
- Update architecture/decision notes when implementation evidence resolves an open decision.
- Keep implementation and docs aligned; include operational limits and known gaps.
- Use relevant installed skills when UI or framework work benefits from them, as mapped in `docs/brain/09-Engineering/Engineering Skills and Agent Guidance.md`.

## Security and quality

- Apply the chosen OWASP ASVS verification baseline from the brain to web/API changes.
- Use secure defaults, least privilege, parameterized APIs/queries, safe errors, and secret-free logs.
- When the user asks for verification, select tests appropriate to the changed layer and report the evidence. Do not state that unrun checks passed.
- Review new dependencies for maintenance, runtime fit, license, known advisories, and transitive risk.
