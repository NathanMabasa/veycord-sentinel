# Threat Model Starter

## Assets

Raw security events, identities, credentials, detection rules, cases and evidence, connector secrets, audit trail, release signing keys, and service availability.

## Threat actors

External attacker, malicious or compromised insider, compromised ingest host, malicious event producer, supply-chain attacker, curious user with excessive privileges, and accidental administrator error.

## Highest-priority threats

- Unauthorized access to indexed events or cases.
- Ingested payload exploiting parser/index/query code.
- Credential or token leakage in logs, exports, backups, or browser state.
- Rule/config tampering to hide activity or flood analysts.
- Query/ingest resource exhaustion causing loss of visibility.
- Cross-tenant data access if multi-tenancy is later introduced.
- Malicious dependency or compromised release artifact.
- Unsafe automated response action impacting production systems.

## Early mitigations

Authentication and per-object authorization; strict parser limits; safe query APIs; resource quotas; append-only audit records; signed artifacts; minimal privileges; backup/restore; explicit manual approval for response; security review of every connector; no public multi-tenant service until isolation is verified.

## Revisit triggers

Before external exposure, before multi-user release, before any hosted service, before a privileged agent, before a response connector, and after a material architecture change.
