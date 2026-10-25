# Proposed Architecture

## Decision status

Concept architecture; validate through a short ingestion/search prototype before selecting a backend.

## Option A: build a new engine

Custom API, queue, parser framework, event store, query engine, detection scheduler, and UI offer maximum control but create large reliability and security scope. Not recommended for the first release.

## Option B: build a product layer on OpenSearch

Use OpenSearch and its Apache-2.0 stack for storage/search, and evaluate its Security Analytics components/APIs. Veycord owns onboarding, guided investigations, packaging, docs, safe defaults, and coherent UX. This reduces reinvention but adds memory/CPU needs and upstream version coupling; test offline installation and upgrades.

## Recommendation

Prototype Option B first. Keep the product adapter layer thin and standards-facing so a backend change remains possible. Avoid wrapping the whole OpenSearch dashboard as the product; make Veycord's workflow and learning path the distinctive layer.

## Logical components

1. **Web app:** overview, explore, detections, alerts, cases, sources, administration.
2. **Control API:** authentication, authorization, configuration, audit events, API validation.
3. **Ingestion:** supported agent/file/syslog paths; bounded queues; parsers; validation; normalization.
4. **Search/storage:** OpenSearch initially; explicit index lifecycle, retention, backup, restore, encryption options.
5. **Detection:** scheduled rule execution, test harness, findings, alert state, correlation later.
6. **Evidence:** immutable-ish event references, analyst notes, timeline, export with provenance.
7. **Packaging:** local Compose for lab, signed container/release artifacts, production guidance.

## Trust boundaries

- Ingest clients to receiver.
- Browser to API.
- API/control plane to search backend.
- Detection worker to event store.
- Administrator to deployment host.
- Optional external notification connectors.

Never expose OpenSearch directly to an untrusted network. Do not let uploaded data define executable queries, scripts, or response commands.
