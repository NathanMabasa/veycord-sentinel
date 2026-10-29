# Identity Provider Decision

SEN-208A-1 / D-026, researched2026-10-29. **Implementation direction: self-managed Better Auth on the existing private Node/Hono host, backed by isolated PostgreSQL identity tables.** This is selection/design evidence, not an enabled authentication service or release approval. No application dependency, database, private environment or public Site is changed by this slice.

## Existing boundary and requirements

The private gateway currently uses one configured bearer service key and workspace; the public Worker imports only synthetic APIs. Neither provides interactive identities. Preserve the accepted portable self-hosted product, Node/PostgreSQL foundation and public/private separation. MFA is required before multi-user use by the commercial sprint plan; older notes calling MFA a later priority do not defer this gate.

Required: maintained password/session/MFA implementation, source-available self-hosting without compulsory cloud enrollment, server-side membership/roles, recovery/revocation, least-privilege database credentials, bounded abuse handling, explicit data ownership and operational review. No new cloud resource or paid service is provisioned by this decision.

## Compared options

| Option | Evidence | Decision |
|---|---|---|
| Neon Managed Better Auth | Official supported-plugin/roadmap pages list MFA as forthcoming, with organization capability partial. Provisioning depends on the managed service and its supported configuration/regions. | Not the initial mandatory-MFA/self-hosted identity implementation. Reconsider when requirements/support change; do not remove database network protections merely to enable it. |
| Self-managed Better Auth | Official Hono and PostgreSQL integrations; upstream TOTP/backup-code plugin. Installed isolated1.7.14 exposes that plugin and its declarations/source match the reviewed flow. MIT package. | Selected for the private Node implementation. Keep existing PostgreSQL; do not migrate the project to a managed database solely to add login. Operating authentication, email/recovery and updates remains our responsibility. |
| Keycloak + maintained OIDC relying-party library | Official self-hosted deployment and OIDC guidance; separate identity service, client and server lifecycle. | Credible future enterprise IdP path, but adds another operated service to the initial single-node product. No unsupported claim that it is insecure or incompatible. Revisit for customer SSO/federation requirements; do not add a speculative generic provider layer now. |

This is an engineering tradeoff for the current scope, not a vendor ranking. The installed neon-auth guidance was consulted; mandatory MFA falls outside its managed default, and the owner's existing database/self-hosting requirements take precedence over migrating to a new service.

## Dependency selection evidence

An ignored isolated project at `.data/identity-selection` resolved exact `better-auth@1.7.14` and `pg@8.23.1`. Installation used `--ignore-scripts`; no auth handler or application connection was started. Reviewed installed plugin exports, source/declarations and MIT LICENSE.md. Its35-package snapshot declares33 MIT and2 ISC licenses; recorded Node engine ranges fit the existing Node22+ baseline. Package registry metadata identified the upstream repository and a recent modification timestamp; that alone is not a maintenance SLA.

The isolated npm audit returned zero listed advisories at this snapshot. This is not an application audit, independent review or proof of safety. Root package.json/package-lock.json remain unchanged. Before integration, repeat full application advisory/license review, pin the chosen version in the root lockfile and update notices/SBOM. Optional adapters and telemetry packages appear in the resolved tree; review actual imports, disable upstream telemetry and keep identity code out of public bundles.

Machine-readable evidence: `docs/audit/identity-selection-dependencies.json`. Installed-package inspection establishes feature availability, not working MFA, schema/role compatibility or Cloudflare deployment. Those require the next implementation's evidence.

## Intended deployment and data flow

```text
Private browser, same origin
    → /api/auth/* → maintained Better Auth handler → identity PostgreSQL role/schema
    → /api/workspace/v1/* → validated session + current MFA assurance
                          → live application membership/role check
                          → authorized workspace-scoped event transaction
```

Only `/api/private/v1/*` exists today. The two additional route families above are intended contracts, not implemented APIs. The fixed-workspace operator service API must remain explicitly separate; a cookie cannot silently fall back to the legacy service key. The public Site must not import auth modules, receive auth/database credentials or imply hosted signup is available.

Prefer same-origin private hosting with HTTPS, an explicit configured base URL and trusted-origin allowlist. No wildcard CORS, trusted forwarded host from arbitrary clients, token URL parameters, browser localStorage sessions or client-supplied workspace authorization. Retain existing CSP; any future proxy deployment requires an explicit trusted-proxy model. Loopback HTTP is a synthetic-development exception only.

### Storage and least privilege

- Generate/review version-pinned identity SQL separately from telemetry migrations. Prefer a dedicated identity schema and runtime role with necessary table DML only; separate administrator/migrator credentials. Never run an automatic DDL migration during application startup or use the telemetry runtime role as a migration credential.
- Confirm schema qualification and plugin table requirements against the installed package. Validate search-path hardening and role separation on an isolated synthetic PostgreSQL cluster before integration. Do not alter the preserved local cluster for this selection.
- Application membership links stable identity IDs to workspace IDs and explicit roles. Authentication is not authorization. Recheck membership on each API/export/job/object operation; document session revocation, membership removal and concurrent-update behavior.
- Reuse bounded pools and transaction-scoped workspace context when membership is introduced. Do not allocate a new pool per request or reuse a mutable workspace context across requests. Existing forced RLS remains defense in depth.
- Password hashes, TOTP secrets, recovery codes, session tokens and signing/encryption keys are sensitive. Recovery/backup/expiry and key rotation must include identity data without making them visible to ordinary telemetry users or logs.

## Session/MFA policy for implementation

These are development defaults to implement and verify, not currently active controls:

1. Start with password + TOTP using the maintained implementation. Do not enable OAuth/social, email-OTP/magic-link or other alternate sign-in routes in this slice. Upstream documents that non-credential sign-ins are not automatically challenged by its two-factor plugin; adding one needs its own MFA assurance review.
2. Require verified TOTP enrollment; do not skip enrollment verification. Support protected backup-code recovery, single-use semantics and revocation with an explicit operator recovery runbook. Keep remembered/trusted-device bypass disabled in the initial policy; any later relaxation requires its own assurance and revocation review. Never emit codes/seed/token values in audit or screenshots.
3. Enforce MFA assurance for the actual session before granting workspace access, including enrollment/recovery transitions. A profile flag such as `twoFactorEnabled` alone is not proof that this session passed MFA. Users missing enrollment can access only the tightly scoped enrollment/logout flow.
4. Use opaque server-backed sessions in HttpOnly, Secure, host-scoped cookies with SameSite policy and upstream CSRF/origin validation retained. No shared-domain cookies. Disable cookie session caching/secondary cache in the first slice so revocation is checked against current server state.
5. Proposed session limits:8h absolute lifetime without sliding extension,30min inactivity,5min freshness for sensitive changes. Upstream exposes session expiry/freshness; the idle/absolute combination must be explicitly implemented and verified rather than assumed from a default7-day session. Limit values can be refined before rollout.
6. Password/MFA disable/reset, membership changes, exports and response actions require explicit permission and appropriate fresh authentication/step-up; keep response actions deferred. Password changes/recovery must revoke applicable sessions and handle failures safely.
7. Disable open registration by default. Bootstrap the first administrator through a short-lived local-only enrollment process, then permanently close that bootstrap path. Later invitations require a separately reviewed, expiring authorization flow; never grant a role based on email domain alone.
8. Configure bounded distributed login/challenge/recovery throttling before multiple replicas or public access. In-memory limits alone are not distributed abuse control. Use generic credential errors while retaining safe attributed security audit.

These requirements deliberately describe work not yet built. A valid session without current membership/MFA assurance must not access telemetry. If identity/session storage is unavailable, fail closed rather than restoring service-key browser access.

## Primary abuse cases and evidence to collect

| Threat | Required response/evidence in SEN-208A-2/B |
|---|---|
| Password accepted before TOTP; alternate route bypass | Pending sessions have no workspace access; verified challenge required; every enabled sign-in/recovery path covered |
| CSRF, malicious redirect or attacker-controlled Host | Explicit origins/base URL, retained upstream checks, rejected cross-origin mutations and untrusted callbacks |
| Stolen/revoked session; stale membership | Server-side revocation, absolute/idle expiry and live role checks; no cookie cache bypass |
| Bootstrap replay or open signup | Time-bound local enrollment, one administrator bootstrap, disabled registration path afterward |
| Brute-force login/TOTP/recovery | Bounded multi-process throttling, recovery limits and non-enumerating errors |
| Cross-workspace request/export/job | Identity-derived authorization, negative access matrix and scoped transactions |
| Identity database compromise/log leakage | Least-privilege separation, protected backups/keys, secret-free audit and safe failures |

No tests or runtime sign-in/MFA flows were run in this selection slice. Full next-slice evidence must include login/logout, reload, enrollment/challenge/recovery, cookie/CSRF behavior, revocation/expiry, role isolation, safe failure, schema/role compatibility and unchanged public build separation. Follow chosen ASVS planning baseline and independent review gates; no certification claim.

## Next implementation inputs and order

1. Add exact dependency only in a reviewed implementation PR; review generated schema and create restricted auth runtime/migration roles in an isolated synthetic database.
2. Build disabled-by-default private auth configuration/handler and local bootstrap. Keep existing private service mode explicit and public Worker unchanged.
3. Implement enrollment/TOTP/session/recovery UI and server assurance, then membership authorization before interactive telemetry access. Derive capabilities server-side; no fake logged-in demo state.
4. Configure production HTTPS origin, sender/SMTP and recovery operator/retention/key responsibilities when real deployment is selected. No SMTP account or email sending is authorized by this decision. Synthetic development can capture mail to a local sink; it cannot claim verified real delivery.
5. Recheck provider-specific operations, data location and costs if a managed identity/database or hosted offering is chosen. No payment/provisioning or migration is required to continue local development.

## Sources (checked2026-10-29)

- [Neon supported plugins](https://neon.com/docs/auth/guides/plugins), [roadmap](https://neon.com/docs/auth/roadmap): managed capability boundary/MFA status.
- [Better Auth Hono integration](https://better-auth.com/docs/integrations/hono), [PostgreSQL integration](https://better-auth.com/docs/adapters/postgresql): integration and schema contracts, not proof of this application's compatibility.
- [Better Auth two-factor plugin](https://better-auth.com/docs/plugins/2fa): enrollment/challenge and non-credential sign-in boundary.
- [Session management](https://better-auth.com/docs/concepts/session-management): expiry, freshness, revocation and cookie-cache limits.
- [Security reference](https://better-auth.com/docs/reference/security): origin/CSRF/cookie/secret handling; verify actual configuration in implementation.
- [Keycloak guides](https://www.keycloak.org/guides), [OIDC endpoints](https://www.keycloak.org/securing-apps/oidc-layers): alternative identity-service model.
- [npm better-auth package](https://www.npmjs.com/package/better-auth): registry metadata corroborated with the installed1.7.14 package/license; transitive inventory recorded in audit evidence.
