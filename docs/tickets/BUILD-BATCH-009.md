# Build batch009 — product onboarding and connections

Owner request: follow the Sentry-style hosted/self-hosted product model, letting people use the website, connect data or download from GitHub. No Sentry account connection is requested.

| Ticket | Build | Acceptance |
|---|---|---|
| SEN-901 | Get-started paths and GitHub source download | Clear web-demo/self-hosting choice; actual public ZIP/repo/docs links; no fake signup or installer claims |
| SEN-902 | Connections catalog and HTTP setup | Current private HTTP ingestion separated from planned parsers/collectors; linkable setup page with honest status |
| SEN-903 | Working setup artifacts | Bounded origin validation, safe Bash commands, copy controls, synthetic check JSON download, no credential field or network probe |
| SEN-904 | Responsive/accessibility/integration evidence |320/768/1440px, keyboard/form/copy/download behavior, API-contract fixture validation, preserved CSP/private separation and required final-head GitHub CI |
| SEN-905 | Hosted workspace provisioning | Deferred to identity/MFA, membership/RBAC, per-workspace credentials, isolation, quotas/privacy/operations and independent-review gates; not implemented by a marketing signup form |

Design and scope: [Hosted and Self-Hosted Onboarding](../brain/05-UX/Hosted%20and%20Self-Hosted%20Onboarding.md). No new runtime dependency is selected.


## Implementation and verification candidate

Three new routes are implemented with existing React/Lucide/native CSS; no runtime dependency was added. Local standard/public builds,42 unit/API/model checks and five built Worker checks pass. The generated Bash is also executed against the actual loopback private HTTP interface with an isolated in-memory store; it authenticates and ingests the downloadable fixture. Existing actual-PostgreSQL integration remains in required CI; the new curl test is not a PostgreSQL test.

Public browser coverage includes320/768/1440px, links, origin rejection, no private probe/key field, copied command equality and the downloaded JSON. Nine new automated axe states initially found low-contrast shared orange buttons/header text; public action fills and the small light-header descriptor were darkened, with the orange mark preserved. The rerun reports zero violations in those nine states; this is not full WCAG conformance. New text sizes, copy failure and keyboard update behavior are exercised. Final-head CI/publication evidence is required before completion.

Final local rerun:65 public browser checks passed, including keyboard-origin update clearing stale copied feedback and clipboard-failure fallback; nine axe states have zero violations and zero incomplete groups. Standard build and42 unit checks were rerun after the feedback correction. Five built Worker checks passed. Final-head CI and publication are pending.

## Review and saved publication candidate

PR13: https://github.com/NathanMabasa/veycord-sentinel/pull/13 . Implementation candidate f3b462ff259489eff636921527fb5464be06b9e8. Required runs verify40701090624 and CodeQL40701090895 were launched; their final conclusions remain pending at this documentation snapshot. No bypass is permitted. Mobile viewport screenshots were inspected separately from full-page captures; the sticky header stays at the viewport top and the origin form remains readable at320px.

The sanitized Site source833801c521b65afbd9cc0945686098bcf0829c04 builds the same application candidate, with the documented Site-only build mapping. Archive validation found exactly dist/server/index.js and dist/.openai/hosting.json, no links or private configuration. Saved version4: appgprj_6ae1df006640819185d4ffa2e912d1b5~appgver_87b6c7975a608191ad18d58cf30cabea . This is a saved candidate, not proof of deployment. Publish only after required final-head CI and protected merge. Hosted provisioning SEN-905 remains deferred; SEN-901/902/903 are implemented and SEN-904 awaits final CI/publication.
