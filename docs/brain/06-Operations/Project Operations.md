# Project Operations

## Public repository baseline

README with a 5-minute path; LICENSE; CODE_OF_CONDUCT; CONTRIBUTING; SECURITY policy and private disclosure contact; issue templates; supported versions; architecture decisions; changelog; maintainers; roadmap.

## Release hygiene

- Versioned releases with checksums and signatures.
- SBOM for release artifacts.
- Dependency and secret scanning in CI.
- Reproducible build notes and provenance/attestation where practical.
- Document supported upgrade paths, backup, rollback, and end-of-support policy.

## Community operations

Keep issues scoped with labels for bugs, source integrations, detections, docs, and good first issues. Treat detection contributions as code: validate metadata, test fixtures, license/provenance, and false-positive notes. Publish a vulnerability response policy before inviting broad deployment.

## Demo operations

Use synthetic data only. Reset state frequently. Display a banner that the demo is not suitable for real telemetry. Avoid collecting account or usage data unless there is a clear user benefit and privacy notice.
