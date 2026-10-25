# Security Requirements

Use OWASP ASVS 5.0 as a verification checklist for Veycord's web/API controls, choosing a risk-appropriate target (Level 2 is a reasonable planning baseline, not a certification claim). Add OWASP Top 10 awareness, Secure Software Development Framework practices, and threat modeling. Recheck current versions before a formal assessment.

## Identity and access

- No default production credentials.
- First-run admin enrollment is time-bounded and local-only, then disabled.
- Strong password hashing through a maintained library; MFA support is a later priority.
- RBAC with least privilege; separate admin, analyst, viewer, and service roles.
- Secure session cookies, CSRF protections, rate limits, lockout/throttling, secure reset flows.
- Every API checks authorization server-side; test cross-user and cross-case access.

## Data protection

- TLS in transit; documented at-rest encryption strategy and key ownership.
- Minimize collection; redact secrets and sensitive fields before indexing where possible.
- Explicit retention and deletion semantics; backups have separate retention controls.
- Treat logs and cases as sensitive data; prevent credentials/tokens entering audit/application logs.
- Tenant isolation is mandatory before any multi-tenant deployment is supported.

## Application and supply chain

- Validate and bound all input: file size, event size, parser recursion, query cost, and upload rate.
- Protect against injection in query construction; use parameterized backend APIs.
- Dependency inventory, vulnerability scanning, SBOM, pinned/reproducible builds, signed releases.
- Secrets never committed; security headers; safe errors; debug disabled in production.
- Secure update process and documented vulnerability disclosure with response targets.

## Audit and operations

Record successful/failed auth, authorization denial, user/role changes, rule/config changes, exports, retention/deletion actions, and response-action attempts. Make audit records access-controlled and tamper-evident where feasible. Monitor audit pipeline health and clock/time synchronization.

## Verification evidence

Map requirements to implementation, owner, and evidence: test, config check, code review, threat model, or documented limitation. Do not use “government grade” or “secure by design” as an unqualified marketing claim.
