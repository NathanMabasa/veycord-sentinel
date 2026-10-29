# Private accounts and MFA — development alpha

The private Node installation now includes disabled-by-default account sign-in, verified TOTP enrollment, one-use recovery-code sign-in, logout, password changes and session revocation. The public hosted website remains a synthetic demo; no hosted signup is enabled. This is a development implementation pending security/integration review, not commercial approval.

## Configure locally

Keep the existing private PostgreSQL setup and separate telemetry runtime role. Use a fresh synthetic database first. Apply `npm run db:bootstrap`, `npm run db:migrate` and the documented workspace seed before identity setup.

Add these server-only settings to your private administrator configuration, using independent generated secrets:

```dotenv
SENTINEL_AUTH_ENABLED=true
SENTINEL_AUTH_ORIGIN=http://127.0.0.1:5173
SENTINEL_AUTH_ALLOW_LOCAL=true
SENTINEL_AUTH_SECRET=replace-with-an-independent-generated-43-character-base64url-secret
SENTINEL_AUTH_RUNTIME_PASSWORD=replace-with-another-generated-43-character-base64url-secret
SENTINEL_AUTH_DATABASE_URL=postgresql://sentinel_identity_app:URL_ENCODED_IDENTITY_PASSWORD@127.0.0.1:54329/veycord?sslmode=disable
```

The origin must exactly match the private browser address. HTTP is accepted only for explicit loopback development. Remote PostgreSQL requires verified TLS (`sslmode=verify-full`); remote app origins require HTTPS. No cloud provisioning is needed for local development. Connection URLs support only `sslmode`; arbitrary driver query overrides (including host/user/TLS/pool options) and duplicates are rejected. Administrator tools additionally set a controlled search path for identity setup. Custom provider parameters need an explicit reviewed implementation.

Run `npm run identity:setup` with your administrator configuration. This applies the reviewed identity SQL and grants a separate `sentinel_identity_app` role restricted to identity tables. The role cannot grant workspace membership or access telemetry directly. The web process never runs identity migrations. The normal telemetry migration005 adds attributed user mutations without changing old audit entries.

## Provision an account offline

Create a private JSON file outside Git with mode0600, at most4KiB:

```json
{"email":"analyst@example.test","name":"Synthetic analyst","password":"REPLACE_WITH_A_UNIQUE_LONG_PASSWORD","role":"admin"}
```

The first account must be an administrator. Later roles can be admin, analyst or viewer. Set `SENTINEL_BOOTSTRAP_FILE` to that file's absolute path in the operator environment, then run:

```sh
npm run identity:operator -- provision
```

Registration is never exposed on the web. Offline provisioning is an explicit administrator action; it does not print a session or password. Securely remove the input file after provisioning. Failed partial provisioning can leave an account without membership; the operator must inspect/fix it before access is possible.

Create a dedicated `.env.runtime` with `npm run config:runtime` only when ready; the command refuses to overwrite an existing file. Review the allowlisted runtime settings. Never give the web process DATABASE_ADMIN_URL, SENTINEL_AUTH_RUNTIME_PASSWORD or SENTINEL_BOOTSTRAP_FILE. Preserve and update existing runtime configuration through your private operational process, not Git or chat.

Start the private app with `npm run dev` for local development, or rebuild with `npm run build` and use `npm start` with the dedicated runtime configuration. Public builds replace dist; rebuild the regular app before private serving.

Open `/workspace` or `/account`. Confirm your password, enter the manual setup key in a TOTP authenticator, save the displayed recovery codes privately, and verify the current code. Password-only and unenrolled sessions cannot read telemetry. Setup keys/recovery codes remain in browser memory and are not stored by the UI in localStorage or URLs.

## Permissions and account security

This slice serves one server-configured workspace. Membership is looked up on the server for each request; clients cannot select a different workspace by changing a field. It is not a hosted multi-tenant deployment.

| Role | Workspace access |
|---|---|
| Viewer | Read events, findings, cases and analytics; no case edits, ingestion, operations or audit |
| Analyst | Viewer access plus create/update cases; no ingestion, operations or audit |
| Admin | All currently implemented workspace operations |

`/api/workspace/v1` uses verified cookies and role checks. `/api/private/v1` retains the explicit single-workspace operator-service key; the accounts API never falls back to that key. `/operator` exposes the legacy operator UI intentionally. Cookie sessions never send a fake bearer credential. Case/event mutation audit records actor `user` with identity ID in details using request-local server context; earlier service/maintenance entries retain their provenance.

Under Account security, verify a current TOTP code before sensitive changes. Password changes revoke other sessions. Sign-out revokes the current session. Server-backed sessions have an8-hour absolute limit and30-minute inactivity limit; metadata and user-driven API activity count as activity. Cookie session caching and trusted-device bypass are disabled. Production cookie/TLS behavior still requires verification on the actual deployment.

For lost MFA, use one saved recovery code at sign-in. For a forgotten password or exhausted recovery codes, the local administrator can use the same protected JSON input with email/password and run:

```sh
npm run identity:operator -- reset-password
```

An explicit `"resetMfa":true` also removes the lost factor and revokes sessions; the user must enroll again before accessing data. Treat this as a privileged recovery procedure with identity verification by the operator. No recovery email or external message is sent. There is no self-service email reset without a configured, reviewed delivery path.

To change/revoke membership, use email, role and boolean active in the private input and run `npm run identity:operator -- membership`. This revokes the user's sessions. The operator command refuses to remove or downgrade the last active administrator and rejects missing memberships. Keep a documented recovery operator; a role label alone does not prove a usable recovery path.

## Bounds and remaining gates

Authentication JSON is capped at8KiB. Shared database-backed route budgets allow30 requests/minute per exposed auth operation; they deliberately fail closed. Existing workspace read/write limits remain process-local and shared by users, so aggressive simultaneous reloads can receive429. They are not a completed distributed SIEM quota model.

Identity tables have closed-lab capacity guards (10,000 users/sessions/verifications;100,000 security audit entries). Reaching a cap fails closed and requires explicit administrator retention/maintenance. Scheduled identity cleanup, external audit anchoring, offsite recovery, public abuse controls, multi-workspace isolation, broader recovery/abuse review and independent assessment remain release gates. Do not open customer telemetry access based only on a successful login.

Selection/version evidence: Identity Provider Decision, `docs/audit/identity-selection-dependencies.json`. Current implementation/browser evidence and unfinished checks are tracked in BUILD-BATCH-011.md. No claim of certification or production readiness is made.

## Reproducible verification

Run `npm run build && npm run test:unit`, then `npm run test:identity` with PostgreSQL16 `initdb`/`pg_ctl` on PATH. CI requires the binaries and enables `SENTINEL_BROWSER_AUDIT=true`; install Python Playwright1.60.0 and Chromium for that path. The suite creates and removes its own synthetic cluster and secrets. It never loads the installation's `.env` for child operator commands. No preserved database is reset.

The identity suite covers password-only/profile-flag rejection, actual enrollment/challenge, simultaneous one-use recovery, expired challenges, signed-cookie tampering, role changes/removal, password/session/operator revocation, idle/absolute expiry, concurrent audit attribution, identity ACL/startup negatives, cookie attributes and rejected Origin/body/route inputs. Each scenario resets only limiter tables in its disposable fixture; a separate case asserts exhausted-budget rejection. These resets are not available in application routes.

Workspace permissions use an explicit read/action allowlist. Percent-encoded path aliases are rejected before Hono routing so route decoding cannot bypass a role check. HTTPS cookie assertions use real handler responses; they do not establish a production proxy/TLS deployment. Readable320px login/workspace/event-card viewport screenshots are recorded in `docs/audit/screenshots/account-*-viewport-320.png` and `account-viewport-320.png`. Browser-only fixture credentials and MFA secrets never enter those screenshots or the public source.
