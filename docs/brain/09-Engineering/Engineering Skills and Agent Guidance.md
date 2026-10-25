# Engineering Skills and Agent Guidance

## How the brain should guide implementation

Before changing code, read [[README]], the relevant component pages, security requirement, decision entry, and workstream. If code conflicts with the brain, inspect evidence and update the relevant decision note rather than silently changing architecture.

## Engineering roles to cover

- Product engineer: user workflow and acceptance criteria.
- Security engineer: threat model, authz, data lifecycle, abuse and supply chain.
- Data/platform engineer: ingest durability, schemas, search/index, retention and cost.
- Detection engineer: Sigma mappings, rule evidence, fixtures, false-positive handling.
- UX/accessibility engineer: accessible workflows and beginner comprehension.
- Release/operations engineer: deploy, backup, incident, upgrades, SBOM/signing.

One developer can cover several roles, but the pull request/decision record should state which concerns were reviewed.

## Codex skill routing

Apply relevant installed Codex skills when performing implementation work:

- **frontend-design** for the visual direction and interaction design of the new security UI.
- **vercel-react-best-practices** when writing or refactoring React components, routing, data fetching, or bundle/performance behavior. Although its source includes Next.js guidance, apply only the React principles that fit a Vite/Workers app; do not introduce Next.js by default.
- **webapp-testing** when browser-based implementation verification is explicitly part of the task or requested by the user.
- **neon-postgres** for applicable PostgreSQL schema/connection guidance after D-017; vendor-specific Neon hosting requires a separate decision. **neon-auth** only if that managed identity is selected; no new interactive identity provider is implemented.
- **plugin-management** if a connected external product/source becomes necessary and no suitable integration is already available.

For architecture research, consult primary product docs and license texts, then record date and evidence in [[08-References/Source Index]]. Skills support coding practice; they do not replace system threat modeling or expert review.

## Senior engineering decision rules

1. Prefer an existing, maintained open standard or upstream service when it reduces custom attack surface and preserves needed portability.
2. Do not select infrastructure from marketing claims; require a workload benchmark and operating-cost estimate.
3. Keep request handlers short; isolate ingestion, indexing, detection and case work by clear interfaces.
4. Every tenant-bound data operation takes identity from verified server context, never a caller-supplied tenant ID alone.
5. Use structured errors and explicit resource limits; fail closed on authorization and fail visibly on ingest degradation.
6. Avoid unsupported security, compliance, performance, and government-readiness claims.
7. Add complexity only to satisfy a demonstrated requirement; record alternatives and rejected options in an ADR.
8. Review each dependency's license, maintenance, security history, runtime compatibility and transitive footprint.
9. Design for safe migrations, retention, backup, deletion, observability and incident response alongside the happy path.
10. Keep code, detections, sample data, docs, and assets under explicit license/provenance control.

## Verification discipline

When implementation verification is requested, use the test/verification method suited to the changed component: unit/contract tests for logic and APIs, worker-runtime tests for Cloudflare bindings, browser tests for UI, and representative load/security tests for data-plane changes. Do not claim a test or assessment passed unless it was actually run and the evidence is retained.


## Reviewed dashboard references (2026-10-25)

The official [shadcn skill](https://ui.shadcn.com/docs/skills) and [upstream MD](https://github.com/shadcn-ui/ui/blob/main/skills/shadcn/SKILL.md) are reference candidates for a future actual shadcn/Tailwind implementation. They were researched, not installed or blindly executed against this native-CSS application. Installed frontend-design, React best practices and webapp-testing remain the active matching skills. [Watermelon UI](https://ui.watermelon.sh/free/react-components) is a visual/composition source; each imported component would need separate license, code/dependency and accessibility review. Current changes need no additional runtime package.
