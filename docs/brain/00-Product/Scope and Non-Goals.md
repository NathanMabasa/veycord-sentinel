# Scope and Non-Goals

## MVP boundary

One user or a small trusted team; one-node deployment; modest data volumes; synthetic/sample data first; a few well-supported source types; searchable normalized events; scheduled detections; alerts and cases; documented backup/restore; local administration and audit trail.

## Candidate MVP source families

1. Linux authentication / system logs.
2. Windows event logs via an established agent or normalized export path.
3. Web server access logs.
4. Firewall or network flow exports in documented formats.

Choose exact formats after a technical spike. Do not build a custom privileged endpoint agent as the first milestone.

## Non-goals for MVP

- Full SPL compatibility.
- Real-time packet inspection or inline firewall enforcement.
- Automated isolation, account disabling, or blocklisting.
- Claiming regulatory compliance based on feature presence.
- A multi-node data lake or high availability architecture.
- Supporting every log source or operating system.

## Guardrails

- Include an explicit resource budget and retention configuration.
- Make deletion and data export discoverable.
- Require user review for any future response action, with audit logging and rollback design.
- Keep a list of unsupported deployment patterns and known limits.
