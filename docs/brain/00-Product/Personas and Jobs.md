# Personas and Jobs

## 1. Learner / aspiring security analyst

**Job:** practice log analysis, detection triage, and incident investigation with realistic data and clear feedback.

Needs guided setup, sample datasets, ATT&CK context, rule explanations, repeatable lab exercises, and a portfolio demo. Must not need access to production logs.

## 2. Small IT team

**Job:** get useful visibility into a limited set of Linux, Windows, firewall, and cloud logs without a high ingest bill.

Needs simple source onboarding, health and lag indicators, retention controls, useful starter detections, backups, and understandable resource requirements.

## 3. Security engineer / detection author

**Job:** write, validate, tune, version, and share detection content.

Needs Sigma import where technically supported, a clear native rule format, rule tests, provenance/license fields, field mapping, regression fixtures, and detections-as-code workflow.

## 4. Public-sector evaluator

**Job:** assess whether software can be deployed and governed in a controlled environment.

Needs offline/on-prem deployment options, identity/access controls, auditability, data residency choices, documentation, SBOM, vulnerability process, signed releases, and evidence. Product must not imply official endorsement or certification.

## First supported jobs

- Learn from bundled, synthetic logs.
- Import a small set of local files and parse them safely.
- Search events by time, source, field, and text.
- Review an alert, understand its evidence, create a case, and export a report.
- Add and test a Sigma or native detection rule.

## Defer

Multi-tenant MSSP operations, massive distributed ingestion, packet capture, endpoint response, and automatic firewall changes. A small, quota-bounded hosted workspace is in scope after security gates.
