# Market and Product Landscape

Research checked 2026-10-23. Listings, feature sets, and license pages change; refresh before public claims.

## Splunk

Splunk's documented core workflow is ingest machine data, search it using SPL, save searches as reports, put reports/searches on dashboards, and configure alerts. Pivot offers a visual path for users who do not write SPL. Splunk provides interactive tours, training, docs, and a trial. Its perpetual free Enterprise edition is described as standalone/single-instance, capped at 500 MB/day, with feature restrictions; exceeding the limit can create warnings that prevent searching. This creates a concrete opening for a no-cap self-hosted community tool, while showing that usability and guided learning matter as much as the query engine.

## Elastic Security

Elastic Security combines event exploration, detection rules, alerts, cases, threat intelligence, endpoint/cloud security features, and integrations. Its self-managed subscription matrix shows that feature availability varies by tier; the free Basic tier is not the same as every advanced capability being free. Its public detection-rules repository is Elastic License 2.0, so do not assume that repository's content can be redistributed under Veycord's license.

## OpenSearch Security Analytics

OpenSearch is Apache-2.0 licensed across its stack. Security Analytics provides log types and field mappings, Sigma-derived rules, detectors, findings, alerts, and cross-source correlation. This is the closest open-source reference for product capabilities and an important option for reuse versus building a separate search/index engine. It has an established interface and APIs but still requires a user to understand ingestion and detector setup; Veycord can focus on guided setup and coherent investigations.

## Sigma

Sigma is a portable detection format and community rule ecosystem. The Sigma specification is public domain; the SigmaHQ repository's rule content is under Detection Rule License (DRL) 1.1. Treat specification and individual rule content separately. Track rule license/provenance per imported rule, and validate obligations before bundling or redistributing community rule packs.

## Product opportunity

Do not attempt to recreate all Splunk platform capabilities. Build a focused defensive workflow with:

- sample-to-real-data guided path;
- pragmatic ingestion and normalization;
- search and saved views;
- portable detections plus tests;
- alert triage and case evidence;
- self-hosting and privacy defaults;
- documentation that teaches users why a workflow exists.

## Further research plan

The next research is not just feature comparison. Validate actual workflows with users, build a source coverage matrix, benchmark ingest/search/detection/storage costs, evaluate late/duplicate delivery, test hosted tenant isolation and deletion, and check open-content licensing. See [[What Makes a Strong Splunk Alternative]] and [[Data Plane Decision and Benchmark]].

## Evidence links

See [[08-References/Source Index]].
