# Information Architecture

## Proposed primary navigation

- **Overview:** source health, event volume, high-priority alerts, recent cases, setup tasks.
- **Explore:** event search, filters, fields, saved searches, charts.
- **Detections:** rule library, status, tests, coverage, tuning.
- **Alerts:** queue, severity, acknowledgement, evidence, suppression state.
- **Cases:** timeline, notes, linked alerts/events, assignments, export.
- **Sources:** connectors, parsing/mapping preview, health, lag, permissions, sample records.
- **Reports:** saved dashboards and exportable summaries.
- **Settings:** users/roles, audit, retention, storage, integrations, system health.

## Domain terms

- **Event:** a normalized record from a source.
- **Finding:** one rule match against evidence.
- **Alert:** an item prioritized for analyst review, possibly grouped/deduplicated.
- **Case:** analyst-owned investigation record with timeline and notes.
- **Detection:** versioned logic plus metadata, mappings, and tests.

Keep these terms consistent in API, UI, and docs.

## Implemented demo navigation (2026-10-25, batch006)

The proposed product inventory above includes future features. The current synthetic demo groups only implemented destinations:

| Group | Destinations |
|---|---|
| Workspace | Overview, Explore events |
| Investigations | Alerts, Cases, Investigation guide |
| Manage | Detections, Sources, Settings |
| Resources | Documentation, GitHub project |

The prior Reports button opened a learning guide; it is now named Investigation guide. No reporting engine is implied. Private workspace is a separate route offered by the workspace chooser; authentication and data remain separate from the browser demo.

Views use native links under `/demo?view=events`, `alerts`, `cases`, `guide`, `detections`, `sources`, or `settings`; bare `/demo` opens Overview. `event` accepts only a known synthetic fixture ID. Unknown view/event inputs fall back to usable content; legacy view aliases `explore` and `reports` remain readable. Refresh, browser history, direct links and open-in-new-tab preserve the destination. Search/filter text is still session state and is not encoded as shareable query syntax.

The header command search finds implemented pages, authored sample-event evidence and explicit appearance/resource actions. It never queries private telemetry or sends input to an external search service. Collapse/theme are browser preferences, not access controls. See `docs/tickets/BUILD-BATCH-006.md` for evidence and limitations.
