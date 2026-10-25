# Authored detection catalog and revision policy

Batch005 implements the metadata/revision slice of SEN-209C. Six experimental authored rules run synchronously against each accepted event. These are deterministic examples, not a comprehensive detection engine. The public demo has a separate presentation catalog; it does not run this PostgreSQL pipeline.

## Inspect what runs

`GET /api/private/v1/rules` returns the current catalog in a `data` array. Use the same bearer authentication as other private routes; never put a key in a URL. No query parameters or client workspace selection are accepted. The shared authenticated read limit and no-store headers apply. The route does not query the database: availability of metadata does not establish database or collection health.

Each record includes ID, per-rule semantic version (numeric major.minor.patch only; no leading zeros, prerelease/build suffixes or components above 999999), name, owner, Apache-2.0 license, authored origin, experimental status, single-event evaluation mode, severity, required normalized attributes, rationale, false-positive guidance, technique mapping, and primary reference URLs. Predicates are excluded. Source of truth: `server/detections.ts`; behavior fixtures: `tests/detections.test.ts`. Current revision for each VC-001 through VC-006 is `1.0.0`.

## Preserve historical evidence

New evaluated findings store `ruleVersion` with the rule ID, reason and bounded field evidence in the same ingestion transaction. Duplicate workspace/source/event IDs do not re-evaluate or rewrite a finding even after a rule update. Existing findings and manually authored seed findings have a null revision; the interface labels this **Version unknown**. Never infer a historical version from today's catalog. Migration004 adds only a nullable column/check constraint; no historical data is backfilled.

The catalog describes the current build. It is not a historical registry. Use the source commit and Git rule history for older definitions; source history and releases must be retained. Version metadata is a maintainer assertion, not a cryptographic signature or independently verified provenance.

## Change and rollback procedure

1. Open a protected pull request describing the behavioral change, required telemetry, source enrichment assumptions, runtime bound, false positives, and security impact.
2. Bump the affected rule's version for predicate, field contract, severity, rationale, or mapping changes. Major: incompatible contract; minor: compatible detection behavior addition; patch: correction. Do not change an existing released definition without a version bump.
3. Add authored/licensed positive, near-miss, missing-field and regression fixtures. Confirm other rules do not gain unintended matches. Record any upstream content/license before importing it.
4. Run build, unit/API, actual PostgreSQL and recovery checks; review CI and limitations before protected merge. Keep status experimental until representative, consented validation establishes precision and recall.
5. To roll back a bad rule, revert its implementation through a protected PR and assign a new increasing revision (e.g. a corrective patch). Deploy that reviewed build. Do not downgrade the database, erase findings, or replay events automatically. Cases and existing evidence stay intact. No runtime rule switch or automatic rollback service exists.

## Remaining SEN-209C work

Time-window and late-event correlation, durable rule history, configurable enablement/tuning, suppressions with attribution/expiry, a false-positive review workflow, and measured detection performance remain open. VC-002 consumes a source-reported count; VC-003 rarity and VC-004/005 approval/change enrichment come from the source. This catalog does not add missing telemetry or validate these upstream judgments. See the brain's Detection Coverage note and remaining release gates.
