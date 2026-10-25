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
