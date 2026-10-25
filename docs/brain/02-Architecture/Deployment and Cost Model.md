# Deployment and Cost Model

## Free paths

1. Browser demo backed only by synthetic data, with resettable state.
2. Local developer/demo setup via one documented command.
3. Self-hosted installation for the user's own telemetry.
4. Offline/air-gapped package path as a later milestone.

## Resource honesty

Publish minimum and recommended CPU/RAM/disk figures only after measurement. Include disk growth examples based on event volume, average event size, index overhead, and retention. Offer configurable retention and clear disk-pressure warnings. A “free” license does not mean zero infrastructure cost.

## Deployment hardening

- Bind local demo to loopback by default.
- Production example uses TLS, authentication, secrets outside source control, restricted network access, non-root containers, and persistent volumes with permissions.
- Pin image versions and publish checksums/signatures.
- Provide backup/restore and upgrade/rollback instructions.
- Separate app and backend credentials; least privilege.
- Provide health endpoints without leaking deployment secrets.

## Government / disconnected environment direction

Explore offline installation, controlled update bundles, auditable configuration, local identity integration, role separation, retention evidence, and explicit data-flow diagrams. Do not claim procurement suitability or compliance until the product is independently assessed against applicable requirements.
