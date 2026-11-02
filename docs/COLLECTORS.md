# Private collector ingestion — first implementation slice

Status2026-11-02: local, opt-in, single configured workspace. This provides machine credentials and a bounded canonical JSON receiver, not a managed collector fleet or a general Syslog/GELF/OTLP listener. Use synthetic data while deployment/security gates remain open. No Graylog source or additional dependency was imported.

## What the pieces do

- `db/collector-operator.ts`: offline database-administrator issuance/revocation. No browser provisioning endpoint. Issue creates256 random secret bits, stores a SHA-256 digest and writes the credential once to a new private0600 file; it never prints the token. A maximum32 lifetime credential rows per workspace bounds storage until reviewed cleanup exists. Expired/revoked rows count toward that limit.
- `server/collector-api.ts`: ingest-only `POST /api/collector/v1/events`; no reads, cases or account fallback. Collector bearer tokens use a distinct `vsc_` prefix. The existing operator key and login cookies do not authorize this API.
- `collector_credentials`: immutable source/workspace binding, expiry/revocation and database-backed request allowance. Runtime may read and update only counter columns; it cannot issue, extend, rebind or revoke a credential. Forced RLS is defense in depth; as elsewhere, possession of the application DB role is a broader trust boundary than an API credential.
- Existing PostgreSQL ingestion: rechecks credential validity under a row lock before storing the batch, validates every event's source, evaluates existing authored rules and atomically stores events/findings/audit. Ingestion audit identifies the collector's credential ID, never its secret/hash.
- `scripts/collector-sample.ts`: a synthetic connectivity check using Node's HTTP client. It is not a log tailer/agent. It reads the private credential file, refuses redirects and remote plaintext HTTP, then prints a searchable event ID and safe counts.

## Set up a synthetic instance

First follow [private workspace setup](PRIVATE-WORKSPACE.md), with separate administrator and restricted runtime configuration. No private files or databases were changed automatically by this feature. Apply migrations with the offline admin configuration:

```sh
npm run db:migrate
```

Migration006 adds credential storage and audit actor/actions. Existing routes remain unchanged. The receiver stays off unless `SENTINEL_COLLECTOR_ENABLED=true`; private mode must also be enabled. There is no public Worker receiver. Start the regular Node build with runtime-only configuration and terminate external traffic at a correctly configured HTTPS proxy. Do not put admin URLs or credential/output file paths in the server process.

Issue a synthetic source credential using the offline admin environment (`.env` is loaded by the operator command):

```sh
umask 077
mkdir -p .data/collector
printf '%s\n' '{"source":"linux-auth","ttlHours":24}' > .data/collector/issue.json
SENTINEL_COLLECTOR_FILE=.data/collector/issue.json \
SENTINEL_COLLECTOR_OUTPUT=.data/collector/credential.json \
npm run collector:operator -- issue
```

The input must be an owned0600 regular file, at most4KiB, without links. Source is a stable lowercase slug, maximum80 characters. Lifetime is1–2160 hours, default24. Output must not already exist and should be inside a private directory. Do not paste its token into screenshots, shell commands, the browser, Git or logs. If issue fails after writing an output, its database transaction is rolled back: that file is not an active credential. Inspect/remove it privately before retrying with a new output path.

With a regular build and configured `.env.runtime`, enabling the receiver for this process is explicit:

```sh
npm run build
SENTINEL_COLLECTOR_ENABLED=true npm start
```

In another shell, send the synthetic sample to the configured Node port (default8787):

```sh
SENTINEL_COLLECTOR_CREDENTIAL=.data/collector/credential.json \
SENTINEL_COLLECTOR_URL=http://127.0.0.1:8787/api/collector/v1/events \
npm run collector:sample
```

The sample includes a source-reported failure count for the existing experimental VC-002 rule. This is not newly implemented multi-event brute-force correlation or proof of an attack. Use a separately authorized account/operator session to search the printed event ID and inspect its finding; the collector credential cannot do that search.

## Contract and failure behavior

Authorization: `Authorization: Bearer <collector-token>` in the header only. Send uncompressed UTF-8 `application/json` with the existing `{ "events": [...] }` shape documented in [PRIVATE-API.md](PRIVATE-API.md). Every event must use the enrolled source slug. Workspace identity comes from server configuration, not the payload. Origin/cookie-bearing requests, query parameters and unknown event/envelope fields are rejected.

Limits:256KiB actual body bytes,1–100 events per batch,10 authenticated requests per database-clock minute per credential (including malformed bodies), eight in-flight receiver requests per gateway instance and a10-second body-read deadline. A counter saturates at11; retries/new sessions/gateway instances cannot reset it. Counter time never moves backward if requests overlap a minute boundary. These bounds do not establish distributed service-wide connection/abuse protection or workload capacity. The existing workspace storage and audit quotas still apply.

202 is returned only after events/findings/audit commit, with `{data:{accepted,duplicates,findings}}`. It is not a promise of an independent disk journal, HA or external notification delivery. Deduplication uses `(workspace, source, eventId)`: first stored payload wins; a repeated ID is counted as a duplicate even if its contents changed. Collectors must retain stable IDs for retries and assign new IDs to different events. Durability still depends on the configured PostgreSQL/storage settings.

401: invalid/unknown/expired/revoked credential.400: invalid canonical data or source mismatch.405: unsupported method.409: workspace capacity reached.413: oversized/compressed body.408: body deadline.429: persisted credential budget; honor `Retry-After`.503: disabled, busy or unavailable receiver/store. Do not retry invalid data forever; retry temporary failures with bounded backoff and the same event IDs. Durable sender buffering, quarantine and managed retry remain GRAY-002 work.

## Rotate, revoke and recover

Rotation is issue a replacement for the same source, distribute it through a private channel, verify delivery, then revoke the old ID. The credential file contains its non-secret `id`; put that ID into a private revoke input:

```json
{"id":"the-issued-credential-UUID"}
```

Run `SENTINEL_COLLECTOR_FILE=<private-revoke-input> npm run collector:operator -- revoke` with offline admin configuration. Revoke is idempotent for an existing ID and audited once. Revocation remains possible at a full audit quota: emergency revocation can add at most one record per lifetime credential (maximum32 above the nominal quota); repeated revoke does not append another. New issue/ingestion still respect the nominal quota. Ingestion that has already acquired its credential lock may finish before revocation commits; after revocation completes, subsequent batches are denied. A grant obtained before revocation cannot start a later ingestion successfully.

Encrypted database backups include credential hashes. Restore revokes all restored collector credentials so a snapshot cannot resurrect later-revoked access. Issue fresh credentials after a recovery drill. Stop the receiver to roll back application code; keep migration006 in place and revoke credentials rather than dropping tables or rewriting migration history. No automatic destructive down migration is provided.

## Evidence and remaining work

See [Graylog adoption tickets](tickets/GRAYLOG-ADOPTION.md) and `docs/audit/collector-foundation.json` for exact local verification. No production/private lab migration, hosting, GitHub push or publication was performed. Source-health UI, collector selection/packaging, persistent sender spool, processing pipelines, independent review and service-wide abuse/operations evidence remain open. Finance source/build separation and PR16's draft release gates are unaffected.
