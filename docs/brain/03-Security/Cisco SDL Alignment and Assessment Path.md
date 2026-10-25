# Cisco SDL Alignment and Assessment Path

Research and engineering decision, 2026-10-25. Links: [[Secure Product Development Lifecycle]], [[Security Requirements]], [[Vulnerability Response Manual]], [[../09-Engineering/Build Map and Traceability]].

## What the request can mean

Cisco's published Secure Development Lifecycle describes security work across development and operation. Its industrial guidance describes IEC 62443-4-1 certification for Cisco's own development process. That certification does not transfer to software inspired by Cisco. We have no Cisco certification, partnership, authorized badge or assessment result for Sentinel. A compatibility program, where available for a specific Cisco integration, would establish a different scoped property from general application security.

The immediate engineering choice is to implement documented lifecycle controls and record evidence. We will use original implementation and public guidance; copying Cisco proprietary product code, branding or assurance claims is not authorized or needed.

## Formal assessment path

1. Define the assessed product version, deployment topology, users, data sensitivity and threat model. A web SIEM, industrial component and organization management system have different assessment scopes.
2. Finish the chosen OWASP ASVS 5.0 Level 2 planning baseline with requirement-level evidence. This is an internal verification target, not an OWASP certification.
3. Resolve identity/MFA/roles, hosted workspace isolation, privacy lifecycle, collection and operational gates before real telemetry. Current shared-key access is an explicit blocker for corporate multi-user operation.
4. Select an independent assessor with a relevant written scope and remediation/retest process. Do not purchase an assessment or promise a certificate without owner approval of scope and cost.
5. If a specific Cisco integration is commercially useful, confirm current program eligibility directly with Cisco and test that integration against its requirements. Do not assume an old partner guide defines today's requirements.
6. Publish only the assessment's actual scope/version, limitations and authorized wording after successful completion. Set a support window, patch policy and reassessment triggers.

## Current engineering actions

The evidence ledger is `docs/security/ASSURANCE-MATRIX.md`. Source is public under Apache-2.0 with private vulnerability reporting, reviewed dependency inventory and synthetic fixtures. Local build, authorization/input/database/recovery/browser checks have recorded evidence. GitHub secret scanning and push protection are enabled. Linux CI and CodeQL have actual passing baseline runs. The initial scan exposed two production backup path races; those were corrected, and a tested gate rejects high/critical SARIF findings. Main now requires PRs and the observed CI/CodeQL check names, including for administrators. Zero open CodeQL alerts is a scoped tool result, not external certification.

Threat modeling, bounded/parameterized data access, least privilege, secure defaults, vulnerability triage and recovery remain active engineering practices. Individually attributable access/audit, external anchoring, complete privacy deletion, hardened hosted deployment, independent assessment and release provenance are still open.

## Sources reviewed

- [Cisco compute hardening guide](https://www.cisco.com/c/en/us/products/collateral/servers-unified-computing/compute-security-hardening-guide-standalone-wp.html), updated June 2026: public CSDL/security engineering guidance; product-specific settings are not blindly applied to Sentinel.
- [Cisco industrial security and IEC 62443](https://www.cisco.com/c/en/us/products/collateral/security/isaiec-62443-3-3-wp.html): scope of industrial process/component requirements and Cisco's own certification.
- [GitHub CodeQL advanced setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning): public-repository analysis and actual-alert review workflow.
- [Official CodeQL action](https://github.com/github/codeql-action): v4 tag peeled to commit `9b3254085494b55a0f7c4c2b3d2d52cc712ce370` on 2026-10-25 and pinned. Static analysis is one layer, not certification or proof of absence.
