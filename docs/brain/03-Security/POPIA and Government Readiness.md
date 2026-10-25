# POPIA and Government Readiness

This is product planning guidance, not legal advice or a compliance attestation.

## POPIA implications

Logs can include personal information such as usernames, IP addresses, device identifiers, and activity. POPIA section 19 requires appropriate, reasonable technical and organizational safeguards to preserve integrity/confidentiality, identify foreseeable risks, establish safeguards, verify them regularly, and update them as risks change. Section 21 addresses operators processing information on behalf of a responsible party. Build privacy and operator responsibilities into deployment docs and contracts if a hosted service is ever offered.

## Product controls that support responsible use

- Data-flow map and clear deployment boundaries.
- Data minimization, redaction, role-limited access, retention controls, deletion and export.
- Logs for access and administrator actions, without logging secrets.
- Encryption and backup guidance.
- Incident response and vulnerability disclosure process.
- Operator/administrator guidance explaining that deployments must set lawful purpose, retention, access, and incident procedures.

These controls can support an organization's safeguards; they do not make the organization compliant automatically.

## Government demonstration readiness

Prioritize evidence and operational discipline: architecture and data-flow diagrams, threat model, secure build/release process, SBOM, vulnerability handling, access control matrix, audit trail, backup recovery evidence, offline deployment, clear license inventory, and change history. Each deployment has different requirements; procurement and classification requirements must be checked with the relevant authority.
