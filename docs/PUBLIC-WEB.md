# Public web demo

The public distribution runs the website, synthetic analyst demo and bounded read-only `/api/v1` API. GitHub remains the source of truth: <https://github.com/NathanMabasa/veycord-sentinel>.

This is the same frontend with an explicit public build mode, not a separate product or a hosted customer database. `/workspace` explains self-hosting instead of requesting an operator key. Demo preferences, alerts and cases stay in each browser. No account, collector, private ingest route or shared database is enabled. Do not enter real security data into demo notes.

## Deployment architecture

Sites publishes a Cloudflare-compatible ESM Worker. The adapter imports only the existing synthetic Hono API. It does not import the private gateway, `pg`, runtime configuration or database credentials. The seven built UI assets are embedded in the Worker; no D1, R2, connector or private HTTP binding is configured. The artifact is about 810 KB before platform compression; the build rejects output above 8 MiB.

`npm run build:public` uses explicit Vite configuration with `.env` loading disabled and allowlisted compile-time flags. It never uses the private gateway's Vite plugin. The regular `npm run build` / Node / PostgreSQL deployment remains available for self-hosting. The public build replaces generated `dist`, so rebuild the regular application before starting the private Node server.

## Build and check

```sh
npm ci
npm run build:public
npm run test:public
npm run preview:public
```

The local Worker adapter listens only on `127.0.0.1:4173`. `python3 scripts/public_site_audit.py` checks routes, responsive layout, GitHub links, API interaction and the absent credential form. This local Node adapter verifies the Worker Fetch interface; a successful Sites deployment is separate evidence of cloud publication.

## Source and publishing

`.openai/hosting.json` contains only the opaque Site ID and disabled storage bindings. It contains no credential. Publishing uses a sanitized export of tracked source into ignored `.data/public-site`, a short-lived credential passed to the Sites helper over hidden stdin, and an archive containing the built Worker plus hosting metadata. Never copy `.env`, `.env.runtime`, `.data/postgres`, keys or backups into the export. Never put provider tokens in Git remotes or source files.

Push the exact source snapshot to the Site's source repository, save its matching build archive, then deploy the returned version. Public access is explicitly requested by the owner. GitHub and Sites source repositories are distinct: GitHub merges do **not** automatically deploy this Site. Each web update needs the reviewed publishing workflow and a verified deployment result.

The sanitized Site snapshot maps its default `build` script to `build:public` and preserves the regular build as `build:self-host`, so the hosting provider cannot accidentally build the private distribution. GitHub retains its original default build. This manifest-only adaptation is recorded alongside the independent Site source commit.

The public Worker preserves the existing CSP, same-origin connections, anti-framing, safe API errors and query bounds. API writes and private routes are unavailable. These protections do not establish production SIEM readiness, compliance or certification. Hosted real telemetry remains gated by [remaining release work](tickets/NEXT-RELEASE-GATES.md).


## Product onboarding

`/get-started` separates the no-install web demo from GitHub source download and private self-hosting. `/connections` distinguishes the actual private HTTP API from planned collectors/parsers. `/connections/http` validates an origin and generates Bash commands plus a synthetic check JSON file. It neither collects a key nor calls the entered private origin. The commands prompt for the key only on the operator's machine, keep it in a subshell, and pass its header via stdin. Current ingestion remains single-operator/private; hosted account and real-data signup are not implemented. See batch009 for validation evidence.

On macOS, run the Sites workflow helper with `COPYFILE_DISABLE=1` so the archive contains only Worker/hosting files and no AppleDouble metadata. Use the helper's exact pushed source commit and unchanged resulting archive.
