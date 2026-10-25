# Local Postgres storage prototype

`PostgresStore` is a Node.js-only persistence adapter for a single configured workspace. It is a storage prototype, not a data-plane selection or production-ready hosted service. PostgreSQL is not used by the public synthetic demo. Do not load real telemetry into this local prototype.

## Local initialization

1. Copy `.env.example` to `.env`. Replace every password/token placeholder with separate random values; URL-encode credentials used in the connection URLs. Keep `.env` private. `POSTGRES_PASSWORD` is the local admin credential; `SENTINEL_APP_PASSWORD` is a different runtime credential with at least 32 characters. For example, generate secrets with `openssl rand -base64 36` and URL-encode the result before putting it in a PostgreSQL URL.
2. Start the local database with `docker compose --env-file .env -f infra/docker-compose.yml up -d --wait`. The sample publishes PostgreSQL on `127.0.0.1:54329` only and attaches it to an internal-only Compose network. The image is pinned to PostgreSQL 16.15. Docker Compose is an optional template; it is not required by the application. For a host-installed PostgreSQL instance, use a loopback address and an explicit `SENTINEL_ALLOW_LOCAL_DATABASE=true` override.
3. Prepare the restricted database role: `npm run db:bootstrap`. This command uses `DATABASE_ADMIN_URL` and `SENTINEL_APP_PASSWORD` to provision `sentinel_app`; it does not print either credential. Run it with an administrative connection kept separate from `DATABASE_URL`.
4. Apply numbered schema changes: `npm run db:migrate`. Migrations are transactional, serialized with a database advisory lock, and require `DATABASE_ADMIN_URL`. Apply them before starting a runtime server.
5. For an explicitly synthetic fixture workspace only, run `npm run db:seed`. It creates the configured workspace through the admin connection and inserts three synthetic examples through `DATABASE_URL`. Repeating the command is safe because event IDs deduplicate within source/workspace.
6. The private Node API can then be enabled with `SENTINEL_PRIVATE_ENABLED=true`, `DATABASE_URL`, `SENTINEL_WORKSPACE_ID`, and a generated `SENTINEL_API_TOKEN` value of 43–128 base64url characters. Keep private API access bound to loopback unless a separately reviewed deployment boundary exists.

For non-local PostgreSQL, use `sslmode=verify-full` in both admin and runtime URLs. The adapter enables certificate and hostname verification using the Node.js platform trust store; credentials or TLS URLs are never printed. Plaintext is accepted only for loopback connections when the caller explicitly sets `allowLocalInsecure` / `SENTINEL_ALLOW_LOCAL_DATABASE=true`.

## Isolation and known limits

The migration owner and `sentinel_app` are separate roles. The runtime role has `NOBYPASSRLS`, cannot own the data tables, and receives only the SELECT/INSERT/UPDATE grants needed by the current contract. All tenant tables use `ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`; missing workspace context denies row visibility. `PostgresStore` starts a transaction for each operation and sets the configured workspace with transaction-local `app.workspace_id`. That ID comes from private server configuration, never from a request field. Composite foreign keys prevent cases from referencing findings in another workspace.

The application connection can set custom PostgreSQL settings, so this RLS policy is defense in depth against application query mistakes; possession of the runtime database credential plus arbitrary SQL access could choose another workspace context. Do not expose database credentials to clients. There is no user membership/RBAC layer, retention/deletion policy, audit trail, backups, queue, or measured search backend in this slice. Case/finding status is prototype state, and raw event fields are stored in PostgreSQL plaintext unless the deployment provides disk encryption.

Storage validation caps an ingest transaction at 200 events and 1 MiB serialized input, up to 20 matches per event / 1,000 findings per batch, 32 KiB raw event text, 16 KiB normalized attributes, 64 attribute keys, and 100 results per page. The Node connection pool is capped at five clients with bounded connection, query, and statement timeouts. Text filtering is a bounded substring scan rather than a measured/indexed search implementation.

Run the isolated local integration test with `npx tsx --test tests/postgres.test.ts`. It creates a disposable temp cluster with `initdb`/`pg_ctl`, a generated password, and two workspaces, then tears the cluster down. It skips only when PostgreSQL's test binaries are unavailable. This is useful evidence for transaction-local RLS and referential isolation, not an independent security review.
