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
