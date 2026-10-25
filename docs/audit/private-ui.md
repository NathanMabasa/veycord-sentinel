# Private workspace UI

Current implementation and evidence, reviewed 2026-10-24.

## Current behavior

`/workspace` is a single-operator interface to the same-origin Node private API at `/api/private/v1`. It reads the configured workspace from PostgreSQL; it does not use the public demo's fixtures as database results. The API is disabled by default and is not a hosted service or a production deployment boundary.

The operator enters a service key in a password field. The key stays in React component memory, is sent as a Bearer header, and is not stored in browser storage or the URL. Disconnect and authentication failure clear the key and private page state. The access model is one shared operator credential, with no individual account, role, or user attribution.

The connected page is ordered for investigation work: summary, event analytics, events, findings, cases, Operations, and recent audit activity.

- The summary and event, finding, and case records are server-reported. Findings and cases persist in the configured PostgreSQL workspace.
- Event search filters by text, source, severity, and a selected 1-hour, 24-hour, 7-day, or 30-day window. The API receives explicit UTC `from`/`to` bounds. Pages contain up to 50 records; the cursor request reuses the same bounds and filters. Event timestamps are displayed in the browser's local time zone.
- At desktop widths the event evidence uses a semantic table with all columns. At widths up to 680px it uses semantic list cards that retain event name, timestamp, source, host, severity, and the Details action. At tablet widths the table remains horizontally scrollable and keyboard accessible.
- Event details use a native dialog. They include the normalized attributes and raw record; that view can contain sensitive event data and is available only after connecting.
- The synthetic-sample action is an explicit POST of the bundled synthetic fixtures. It is not a live collector or a substitute for observed telemetry.
- Findings show the matched rule, evidence, and a route into case work. Cases support creation from a finding, explicit analyst-note save, and close/reopen actions. The shared service actor is recorded by the server rather than a named analyst.
- Event analytics are independent of the event-list filters and always summarize the latest 24 hours from the configured store. The bar chart, source totals (top 10), and severity totals are real database query results. Analytics timestamps are labeled UTC. The hourly values can be expanded as a text list; loading, error, empty-window, and empty-breakdown states are explicit.
- Operations shows the store's event, event-byte, case, and audit-entry usage against configured workspace limits, plus retention age, eligible count, held count, and cutoff. Eligibility means an event is past the cutoff; it does not mean deletion has run. Case-linked evidence remains held.
- Recent audit activity displays up to 100 entries. It shows action, timestamp, shared service/maintenance actor, and resource ID; it does not render audit details, event payloads, case notes, or credentials. The API audit actor is not individual attribution or externally anchored tamper-proof storage.

## API contract used

- `GET /api/private/v1/summary`
- `GET /api/private/v1/analytics` (fixed 24-hour range; no client filters)
- `GET /api/private/v1/events?limit=50&from=…&to=…&q=…&source=…&severity=…&cursor=…`
- `GET /api/private/v1/findings`
- `GET /api/private/v1/cases`
- `GET /api/private/v1/operations`
- `GET /api/private/v1/audit`
- `POST /api/private/v1/events` with `{ events: [...] }`
- `POST /api/private/v1/cases` with `{ title, note, findingId }`
- `PATCH /api/private/v1/cases/:id` with `{ note, status }`

Requests use `Authorization: Bearer <key>`, `credentials: omit`, and `cache: no-store`. The private API binds the workspace through server configuration; the browser cannot choose one. Safe `409 QUOTA_EXCEEDED` errors direct the operator to Operations and the local administrator. Other errors do not expose database details.

## Verification evidence

The current real-PostgreSQL browser run is recorded in [`private-browser-results.json`](private-browser-results.json): all 55 checks passed. The browser flow used a fresh isolated database and synthetic records. It covered anonymous denial, empty-state and zero-analytics behavior, eight-event ingestion and five findings, actual hourly totals, capacity/audit updates, case create/save/close/reconnect, filtering, 63-row cursor pagination, and disconnect. It also checked layout and event-card details at 320, 360, 390, 768, 1024, and 1440 pixels. See the matching current screenshots, including [`private-workspace-overview-1440.png`](screenshots/private-workspace-overview-1440.png), [`private-workspace-mobile.png`](screenshots/private-workspace-mobile.png), and [`private-event-card-320.png`](screenshots/private-event-card-320.png).

The recorded local checks are `npm run build`, [`unit-tests-batch003.txt`](unit-tests-batch003.txt) (33 passing tests), [`database-tests-batch003.txt`](database-tests-batch003.txt) (2 PostgreSQL tests, no skips), and [`recovery-tests-batch003.txt`](recovery-tests-batch003.txt) (2 backup/recovery tests). [`private-config-check.json`](private-config-check.json) records that configured secrets were absent from the checked build files and the private runtime config had mode 0600. These are local synthetic-data checks, not remote CI, an independent security assessment, or release approval.

The older `private-workspace-connected*` and `private-workspace-disconnected*` screenshots document a historical Playwright run with intercepted/mock API responses. They are visual mock evidence only and do not prove PostgreSQL behavior. The current real-database screenshots generated by `scripts/private_browser_audit.py` are the `private-workspace-overview-1440.png`, `private-workspace-desktop.png`, `private-workspace-mobile.png`, `private-workspace-scroll-*`, `private-event-card-*`, `private-event-long-value-320.png`, and `private-workspace-top-320.png` files.

The current real-DB browser script checks all four event time-range choices against their exact API timestamp bounds, search filtering and cursor reuse. No browser check establishes accessibility conformance beyond the specific semantic and keyboard behaviors listed above.

## Limits

The UI and service are a local single-operator foundation. They do not provide per-user authorization, workspace membership, an external audit anchor, scheduled retention, subject-level privacy export/deletion, offsite backup scheduling, or a hosted real-data service. Review the remaining gates in [`NEXT-RELEASE-GATES.md`](../tickets/NEXT-RELEASE-GATES.md) before using real telemetry or describing this as production-ready.
