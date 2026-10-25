# Private database workspace

Updated 2026-10-24. This is a single-operator development foundation. The public demo and private workspace use the same source, with separate data paths. The shared service key is an operator credential, not user login, roles, or enterprise tenancy. Start with synthetic records in a private environment; real telemetry rollout remains gated by SEN-208.

## What runs where

| Component | Responsibility | State |
|---|---|---|
| React/Vite UI | Public site, synthetic demo, private workspace forms | Built assets; no embedded database credentials |
| Hono Node gateway | Public fixture API and separately enabled authenticated private API | One trusted workspace from server configuration |
| PostgreSQL 16 | Events, authored-rule findings, investigation cases | Private, durable database; schema/migrations are public |
| Cloudflare static hosting | Public landing/docs/synthetic UI | Can host built UI; static hosting does not run this Node API |

Private path: `/workspace` → same-origin `/api/private/v1` → parameterized `PostgresStore` → forced workspace RLS. Browser requests cannot select a workspace. RLS also reduces query mistakes; someone holding database credentials with arbitrary SQL can change the custom workspace setting. Never share runtime database credentials with a browser.

## Reproduce locally

Requires Node.js 22+, npm and PostgreSQL 16 (host installation or Docker Compose).

1. `npm ci`. Copy `.env.example` to `.env`; restrict that file to the owner. Generate separate admin/runtime passwords and service key, for example `node -e "console.log(require('node:crypto').randomBytes(36).toString('base64url'))"` for each. Never put secrets in `VITE_*` variables. Keep PostgreSQL URL passwords URL-encoded. Replace the sample workspace UUID for a private installation.
2. Start the local database: `docker compose --env-file .env -f infra/docker-compose.yml up -d --wait`, or use an existing private PostgreSQL instance. Compose binds port 54329 to loopback only. It is a database development template, not a full production deployment.
3. `npm run db:bootstrap` prepares the `sentinel_app` login role using the separate admin connection. `npm run db:migrate` applies transactional numbered migrations. Admin/migration credentials must not be the API runtime credential.
4. For the synthetic first run, `npm run db:seed` explicitly creates the configured workspace and inserts labeled fixtures. It is not automatic on application startup. For an empty workspace, an administrator can insert its UUID/name into `workspaces` using a parameterized administrative client; no public provisioning route exists.
5. Set `SENTINEL_PRIVATE_ENABLED=true`. `DATABASE_URL` must use `sentinel_app`, with no ownership, superuser or BYPASSRLS. Set `SENTINEL_WORKSPACE_ID` and `SENTINEL_API_TOKEN`. The token must be 43–128 base64url characters and generated randomly. Local plaintext requires explicit `SENTINEL_ALLOW_LOCAL_DATABASE=true`; remote URLs require `sslmode=verify-full` and a trusted certificate.
6. `npm run build`, `npm run config:runtime`, then `npm start`. Open `http://127.0.0.1:8787/workspace`. Paste the service key. It stays in component memory and is cleared on disconnect/reload; no cookie, URL or browser persistence stores it. The key confers all current operator permissions.
7. Add synthetic sample events, inspect evidence, create a linked case and save/close it. PostgreSQL persists these changes across reconnects. The public `/demo` remains synthetic and browser-local.

Maintenance npm scripts load `.env`; the standalone runtime reads `.env.runtime`. direct `npx tsx db/...` calls require environment variables to be exported separately. Vite dev/preview also loads server-only configuration, but never use Vite's development server as the internet deployment.

## Before remote access or real telemetry

Complete SEN-208: maintained identity with MFA and per-user roles; authenticated per-workspace membership; security audit records; input redaction; enforced storage/retention quotas and deletion; encrypted storage and key ownership; backup plus verified restore; monitoring and incident ownership; privacy and residency review; independent assessment against the chosen OWASP ASVS baseline. Process-local request limits do not protect unauthenticated edge traffic; separate server-configured logical event/byte/case/audit capacities bound application writes. Physical disk overhead needs independent monitoring. Findings/cases lists expose the newest 100 records; event search supports bounded time ranges and cursors. There is no case export/privacy-deletion flow or automatic retention worker yet. Manual retention, logical workspace quotas and mutation audit are implemented; see [operations](OPERATIONS.md).

The standalone server binds loopback by default. A reviewed deployment can set an explicit interface plus `SENTINEL_ALLOW_NETWORK_BIND=true`; place it behind HTTPS, restrict network access, keep PostgreSQL off public interfaces, and cap request bodies/timeouts at the proxy. Don't forward service keys into access logs. Admin configuration should be supplied only to setup jobs, not a long-running production process. This local setup is not a high availability service. See [API contract](PRIVATE-API.md), [database details](../db/README.md), [deployment decision](brain/02-Architecture/Private%20Deployment%20Decision.md).

## This checkout's local development instance

A host-installed PostgreSQL cluster has been initialized under ignored `.data/postgres`, listening only on `127.0.0.1:54329`. `.env` has owner-only permissions and generated separate credentials; never commit or paste it into issues. Its initial records are explicitly synthetic. This is a local database, not a cloud deployment. The private route works on the Vite development origin and the standalone server at `http://127.0.0.1:8787/workspace` while those processes run. Read `SENTINEL_API_TOKEN` from your private `.env.runtime` when connecting; the site does not reveal it.

Stop PostgreSQL gracefully with `pg_ctl -D "$PWD/.data/postgres" -m fast -w stop`. Restart with `pg_ctl -D "$PWD/.data/postgres" -l "$PWD/.data/postgres.log" -o "-h 127.0.0.1 -p 54329 -c max_connections=20 -c shared_buffers=64MB" -w start`. The database does not automatically start at login. Restart the application with `npm start` after building. This instance is not a backup, managed database, recovery setup or authorization for customer telemetry.

## Operations update

The runtime uses compiled `build/server/node.js` and a separate `.env.runtime`; `npm run config:runtime` creates that owner-only file from allowed source settings and refuses overwrite. Migration/recovery credentials stay in maintenance processes. See [operations](OPERATIONS.md) for quotas, audit capacity, explicit retention and the new analytics endpoint, and [recovery](BACKUP-AND-RESTORE.md) for encrypted full-database backup/restore. These controls do not complete the remaining corporate or privacy gates. The current local encryption key is stored outside the repository at `~/.config/veycord/backup.key`; local encrypted archives are under ignored `.data/backups`. Copying keys and archives to the same backup destination defeats that separation. No offsite copy or backup schedule has been configured.
