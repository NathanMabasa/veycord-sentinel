# Data and Detection Standards

## Event model proposal

Preserve raw payload in a restricted field or separately stored blob according to retention policy. Normalize common fields for time, source, host, user, event category, action, outcome, network endpoints, process, and cloud identity. Record parser/version and ingestion time. Keep source timestamp and ingestion timestamp distinct.

## Schema choices to validate

- **ECS:** broad ecosystem and mappings used by Elastic and OpenSearch Sigma integration.
- **OCSF:** open, vendor-neutral schema with security-event focus; useful for cloud/audit event categories.
- **Sigma:** rule format, not an event schema.

Support imported field mappings where practical; document translation losses and unsupported rule constructs.

## Query experience

MVP: time picker, free-text search, field filters, boolean operators, saved searches, and export. Keep the query syntax documented and safe. Do not promise SPL compatibility. Later evaluate a Veycord query language or Sigma-to-backend translation.

## Source onboarding

Each connector needs an owner, supported versions, event examples, parser, normalized mapping, health checks, privacy notes, resource limits, troubleshooting steps, and fixtures. Show sample records before data is accepted.
