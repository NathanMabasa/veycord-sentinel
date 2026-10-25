# Detection Content and Data Rights

## Open formats

- Evaluate Sigma rules for portable detection content.
- Evaluate ECS and OCSF as normalization targets; avoid committing prematurely to a custom schema.
- Keep raw event access where safe so normalization does not destroy evidence.
- Store source, rule ID, version, license, attribution, and upstream URL with every imported detection.

## Rule quality lifecycle

Each bundled rule should include: purpose, source log types, required fields, severity rationale, ATT&CK mapping where applicable, references, false-positive guidance, tuning knobs, license, author, version, and test fixtures. Label rules as experimental until tested against representative data.

## Test strategy for content

- Positive fixture: rule should match.
- Negative fixture: ordinary near-miss should not match.
- Field mapping test: supported sources map to expected normalized fields.
- Regression: a rule update must explain changed behavior.
- License/provenance check: release tooling rejects unclassified rules.

## Safe sample data

Provide synthetic or explicitly redistributable data. Never bundle real incident data, personal information, or third-party logs without permission. Make sample-data labels obvious in the UI and reports.
